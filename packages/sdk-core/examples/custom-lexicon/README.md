# Custom Lexicon Example

This example demonstrates how to create and use a custom lexicon for evaluating hypercerts.

## Files

- `lexicon.ts` - Lexicon definition using builder utilities
- `types.ts` - TypeScript type definitions
- `operations.ts` - Custom operation class
- `usage.ts` - Example usage
- `example.test.ts` - Tests demonstrating the full workflow

## The Use Case

We're building an evaluation system for hypercerts where:

1. **Evaluators** can score hypercerts from 0-100
2. **Evaluations** reference specific hypercerts using strongRefs
3. **Methodology** describes how the evaluation was conducted
4. **Multiple evaluations** can exist for the same hypercert over time

## Quick Start

```bash
# Install dependencies
pnpm install

# Run the example
pnpm tsx examples/custom-lexicon/usage.ts

# Run tests
pnpm test examples/custom-lexicon
```

## Example Output

```
✓ Registered custom lexicon: org.example.evaluation
✓ Created hypercert: at://did:plc:abc.../org.hypercerts.claim.activity/xyz...
✓ Created evaluation: at://did:plc:abc.../org.example.evaluation/abc...
  Score: 85/100
  Methodology: Peer review by three independent experts

✓ Created second evaluation: at://did:plc:abc.../org.example.evaluation/def...
  Score: 90/100
  Methodology: Updated review after evidence submission
```

## Key Concepts Demonstrated

### 1. Lexicon Definition

See `lexicon.ts` for how to define a custom record schema using builder utilities.

### 2. TypeScript Types

See `types.ts` for strongly-typed interfaces that match the lexicon.

### 3. Custom Operations

See `operations.ts` for a domain-specific API built on top of `BaseOperations`.

### 4. Validation

The SDK automatically validates records against the registered lexicon before creation.

### 5. StrongRefs

Evaluations use strongRefs to reference the exact version of a hypercert.

## Important Notes

### Numeric Types: Integer vs String

This example uses `integer` type for the score field to demonstrate that feature. However, **in production**, consider these guidelines:

**Use String for numeric values when:**
- Values may include decimals or fractions
- Precision is critical (financial calculations, scientific measurements)
- Values might be very large
- Following the hypercerts lexicon pattern (see `org.hypercerts.claim.measurement`)

**Use Integer only when:**
- Values are always whole numbers (counts, ratings, votes)
- The range is well-defined and small
- Integer semantics are important to your domain model

The hypercerts lexicon uses strings for numeric values (like `value` in measurements) to avoid JavaScript float precision issues. This is the recommended approach for most numeric data.

## Learn More

- [Custom Lexicons Guide](../../docs/custom-lexicons.md)
- [Sidecar Pattern Guide](../../docs/sidecar-pattern.md)
- [SDK API Reference](../../README.md)
