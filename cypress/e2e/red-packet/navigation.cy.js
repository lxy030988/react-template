describe('Red Packet Navigation', () => {
  it('should navigate to red packet page from header', () => {
    cy.visit('/');
    
    // Check home page loads
    cy.contains('ReactTemplate').should('be.visible');
    
    // Click Red Packet link
    cy.contains('Red Packet').click();
    
    // Verify URL changed
    cy.url().should('include', '/red-packet');
    
    // Verify page content - WalletHeader renders
    cy.contains('红包系统').should('be.visible');
  });

  it('should display connect wallet button when not connected', () => {
    cy.visit('/red-packet');
    
    // Should show connect button in WalletHeader
    cy.contains('连接 MetaMask (Sepolia)').should('be.visible');
  });

  it('should display red packet message when wallet not connected', () => {
    cy.visit('/red-packet');
    
    // RedPacketSystem shows "请先连接钱包" when not connected
    cy.contains('请先连接钱包').should('be.visible');
  });
});

