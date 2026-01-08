# Testing Strategy

### Coverage Targets

- **Core Engine** : 90%+
- **Detectors** : 85%+ each
- **Services** : 80%+
- **Handlers** : 75%+

### Test Organization

```
lib/fraud-detection-v2/
  ├── core/
  │   ├── engine.ts
  │   └── __tests__/
  │       └── engine.test.ts
  └── detectors/
      ├── card-testing.detector.ts
      └── __tests__/
          └── card-testing.detector.test.ts
```

### Regression Testing

```typescript
// V1 vs V2 agreement tests (shadow mode validation)
describe('V1 vs V2 Regression', () => {
  it('should match V1 decisions for known cases', async () => {
    const v1Result = await detectFraudV1(context);
    const v2Result = await detectFraudV2(context);
    expect(v2Result.decision).toBe(v1Result.decision);
  });
});
```

---
