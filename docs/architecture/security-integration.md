# Security Integration

### Security Measures

1. **Multi-Tenant Isolation** : Toujours filtrer par `organizationId`
2. **Webhook Verification** : Stripe signature verification
3. **Input Validation** : Zod schemas pour toutes entrées
4. **Authorization Checks** : Dans repositories, pas dans business logic

### Security Testing

```typescript
describe('Multi-Tenant Isolation', () => {
  it('should not allow cross-org access', async () => {
    const detection = await repo.findById(id, org2Id);
    expect(detection).toBeNull(); // Org1 detection not accessible by Org2
  });
});
```

---
