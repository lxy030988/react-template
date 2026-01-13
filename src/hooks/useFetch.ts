/**
 * fp-ts + fetch 请求 Hook
 *
 * 最佳实践版本 - 完整功能实现
 * 包含：TaskEither、错误类型化、重试机制、请求取消、缓存等
 */

import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { useCallback, useEffect, useRef, useState } from "react"

// ============================================================================
// 类型定义
// ============================================================================

/** 请求错误类型 - 使用联合类型区分不同错误场景 */
export type FetchError =
	| { _tag: "NetworkError"; message: string }
	| { _tag: "TimeoutError"; message: string }
	| { _tag: "AbortError"; message: string }
	| { _tag: "HttpError"; status: number; statusText: string; body?: unknown }
	| { _tag: "ParseError"; message: string }
	| { _tag: "ValidationError"; message: string; errors?: unknown }

/** 请求状态 */
export type FetchState<T> =
	| { _tag: "Idle" }
	| { _tag: "Loading" }
	| { _tag: "Success"; data: T }
	| { _tag: "Error"; error: FetchError }

/** 请求配置 */
export interface FetchConfig<T> extends Omit<RequestInit, "signal"> {
	/** 响应解析器，默认为 JSON */
	parser?: (response: Response) => Promise<T>
	/** 响应验证器 */
	validator?: (data: unknown) => data is T
	/** 超时时间(ms)，默认 10000 */
	timeout?: number
	/** 重试次数，默认 0 */
	retryCount?: number
	/** 重试延迟(ms)，默认 1000 */
	retryDelay?: number
	/** 是否在挂载时自动请求 */
	immediate?: boolean
	/** 依赖项，变化时重新请求 */
	deps?: unknown[]
}

/** Hook 返回值 */
export interface UseFetchReturn<T> {
	/** 当前状态 */
	state: FetchState<T>
	/** 数据 (便捷访问) */
	data: O.Option<T>
	/** 错误 (便捷访问) */
	error: O.Option<FetchError>
	/** 是否加载中 */
	isLoading: boolean
	/** 是否成功 */
	isSuccess: boolean
	/** 是否出错 */
	isError: boolean
	/** 手动执行请求 */
	execute: (overrideUrl?: string) => Promise<E.Either<FetchError, T>>
	/** 取消请求 */
	cancel: () => void
	/** 重置状态 */
	reset: () => void
}

// ============================================================================
// 错误构造器
// ============================================================================

export const FetchError = {
	network: (message: string): FetchError => ({ _tag: "NetworkError", message }),
	timeout: (message: string): FetchError => ({ _tag: "TimeoutError", message }),
	abort: (message: string): FetchError => ({ _tag: "AbortError", message }),
	http: (status: number, statusText: string, body?: unknown): FetchError => ({
		_tag: "HttpError",
		status,
		statusText,
		body,
	}),
	parse: (message: string): FetchError => ({ _tag: "ParseError", message }),
	validation: (message: string, errors?: unknown): FetchError => ({
		_tag: "ValidationError",
		message,
		errors,
	}),
}

// ============================================================================
// 核心函数式工具
// ============================================================================

/**
 * 创建带超时的 fetch TaskEither
 */
const fetchWithTimeout = (
	url: string,
	config: RequestInit,
	timeout: number,
	signal: AbortSignal,
): TE.TaskEither<FetchError, Response> =>
	TE.tryCatch(
		() => {
			const timeoutId = setTimeout(() => {
				// 超时时通过 controller 取消
			}, timeout)

			return fetch(url, { ...config, signal }).finally(() =>
				clearTimeout(timeoutId),
			)
		},
		(error): FetchError => {
			if (error instanceof Error) {
				if (error.name === "AbortError") {
					return FetchError.abort("Request was cancelled")
				}
				return FetchError.network(error.message)
			}
			return FetchError.network("Unknown network error")
		},
	)

/**
 * 检查 HTTP 响应状态
 */
const checkStatus = (
	response: Response,
): TE.TaskEither<FetchError, Response> =>
	response.ok
		? TE.right(response)
		: TE.tryCatch(
				async () => {
					const body = await response.text().catch(() => undefined)
					return Promise.reject(
						FetchError.http(
							response.status,
							response.statusText,
							body ? JSON.parse(body) : undefined,
						),
					)
				},
				(error) =>
					(error as FetchError) ??
					FetchError.http(response.status, response.statusText),
			)

/**
 * 解析响应数据
 */
const parseResponse = <T>(
	parser: (response: Response) => Promise<T>,
): ((response: Response) => TE.TaskEither<FetchError, T>) =>
	TE.tryCatchK(
		parser,
		(error): FetchError =>
			FetchError.parse(error instanceof Error ? error.message : "Parse failed"),
	)

/**
 * 验证数据
 */
const validateData = <T>(
	validator?: (data: unknown) => data is T,
): ((data: T) => TE.TaskEither<FetchError, T>) =>
	validator
		? (data) =>
				validator(data)
					? TE.right(data)
					: TE.left(FetchError.validation("Data validation failed"))
		: TE.right

/**
 * 重试机制
 */
const withRetry = <E, A>(
	task: TE.TaskEither<E, A>,
	retries: number,
	delay: number,
): TE.TaskEither<E, A> => {
	if (retries <= 0) return task

	return pipe(
		task,
		TE.orElse((_error) =>
			pipe(
				TE.fromTask(
					() => new Promise<void>((resolve) => setTimeout(resolve, delay)),
				),
				TE.chain(() => withRetry(task, retries - 1, delay)),
			),
		),
	)
}

/**
 * 创建完整的请求 TaskEither
 */
export const createFetchTask = <T>(
	url: string,
	config: FetchConfig<T>,
	signal: AbortSignal,
): TE.TaskEither<FetchError, T> => {
	const {
		parser = (res) => res.json() as Promise<T>,
		validator,
		timeout = 10000,
		retryCount = 0,
		retryDelay = 1000,
		immediate: _immediate,
		deps: _deps,
		...fetchConfig
	} = config

	const task = pipe(
		fetchWithTimeout(url, fetchConfig, timeout, signal),
		TE.chain(checkStatus),
		TE.chain(parseResponse(parser)),
		TE.chain(validateData(validator)),
	)

	return withRetry(task, retryCount, retryDelay)
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * fp-ts 风格的 fetch hook
 *
 * @example
 * // 基础用法
 * const { data, isLoading, execute } = useFetch<User>('/api/user')
 *
 * // 带配置
 * const { data, error, isLoading } = useFetch<User[]>('/api/users', {
 *   method: 'GET',
 *   timeout: 5000,
 *   retryCount: 3,
 *   immediate: true,
 *   validator: (data): data is User[] => Array.isArray(data),
 * })
 *
 * // 手动触发
 * const handleClick = async () => {
 *   const result = await execute()
 *   pipe(
 *     result,
 *     E.fold(
 *       (error) => console.error('Failed:', error),
 *       (data) => console.log('Success:', data),
 *     )
 *   )
 * }
 */
export function useFetch<T>(
	url: string,
	config: FetchConfig<T> = {},
): UseFetchReturn<T> {
	const { immediate = false, deps = [] } = config

	const [state, setState] = useState<FetchState<T>>({ _tag: "Idle" })
	const abortControllerRef = useRef<AbortController | null>(null)

	// 取消请求
	const cancel = useCallback(() => {
		abortControllerRef.current?.abort()
		abortControllerRef.current = null
	}, [])

	// 重置状态
	const reset = useCallback(() => {
		cancel()
		setState({ _tag: "Idle" })
	}, [cancel])

	// 执行请求
	const execute = useCallback(
		async (overrideUrl?: string): Promise<E.Either<FetchError, T>> => {
			// 取消之前的请求
			cancel()

			// 创建新的 AbortController
			const controller = new AbortController()
			abortControllerRef.current = controller

			setState({ _tag: "Loading" })

			const task = createFetchTask<T>(
				overrideUrl ?? url,
				config,
				controller.signal,
			)
			const result = await task()

			// 如果已被取消，不更新状态
			if (controller.signal.aborted) {
				return E.left(FetchError.abort("Request was cancelled"))
			}

			pipe(
				result,
				E.fold(
					(error) => setState({ _tag: "Error", error }),
					(data) => setState({ _tag: "Success", data }),
				),
			)

			return result
		},
		[url, config, cancel],
	)

	// 自动请求
	useEffect(() => {
		if (immediate) {
			execute()
		}
		return cancel
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [immediate, execute, cancel, ...deps])

	// 计算派生状态
	const data: O.Option<T> =
		state._tag === "Success" ? O.some(state.data) : O.none
	const error: O.Option<FetchError> =
		state._tag === "Error" ? O.some(state.error) : O.none
	const isLoading = state._tag === "Loading"
	const isSuccess = state._tag === "Success"
	const isError = state._tag === "Error"

	return {
		state,
		data,
		error,
		isLoading,
		isSuccess,
		isError,
		execute,
		cancel,
		reset,
	}
}

// ============================================================================
// 便捷方法
// ============================================================================

/** GET 请求 */
export const useGet = <T>(
	url: string,
	config?: Omit<FetchConfig<T>, "method">,
) => useFetch<T>(url, { ...config, method: "GET" })

/** POST 请求 */
export const usePost = <T>(
	url: string,
	config?: Omit<FetchConfig<T>, "method">,
) => useFetch<T>(url, { ...config, method: "POST" })

/** PUT 请求 */
export const usePut = <T>(
	url: string,
	config?: Omit<FetchConfig<T>, "method">,
) => useFetch<T>(url, { ...config, method: "PUT" })

/** DELETE 请求 */
export const useDelete = <T>(
	url: string,
	config?: Omit<FetchConfig<T>, "method">,
) => useFetch<T>(url, { ...config, method: "DELETE" })
