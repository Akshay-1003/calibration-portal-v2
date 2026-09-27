# Console Statement Migration Guide

This document provides guidance for migrating console statements to the centralized logger utility.

## Migration Pattern

### Before
```typescript
console.log('Debug message', data);
console.info('Info message');
console.warn('Warning message');
console.error('Error message', error);
console.debug('Debug message');
```

### After
```typescript
import { logger } from '../utils/logger';

logger.log('Debug message', data);
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
logger.debug('Debug message');
```

## Logger Behavior

- **Development**: All log levels are shown
- **Production**: 
  - `error()`: Always shown
  - `warn()`: Only if `ENV.ENABLE_LOGGING === true`
  - `log()`, `info()`, `debug()`: Only if `ENV.ENABLE_LOGGING === true`

## Migration Checklist

- [ ] Replace `console.log` → `logger.log`
- [ ] Replace `console.info` → `logger.info`
- [ ] Replace `console.warn` → `logger.warn`
- [ ] Replace `console.error` → `logger.error`
- [ ] Replace `console.debug` → `logger.debug`
- [ ] Import logger: `import { logger } from '../utils/logger';`

## Files to Migrate

Approximately 386 console statements across 106 files need migration. Priority order:

1. **Critical**: Error handlers, API services (✅ Done)
2. **High**: Store files (`src/store/*.ts`)
3. **Medium**: Component files (`src/components/**/*.tsx`)
4. **Low**: Utility files, hooks

## Automated Migration (Optional)

A script can be created to automate this migration:

```bash
# Find all console statements
grep -r "console\.\(log\|info\|warn\|error\|debug\)" src/

# Replace pattern (use with caution, review changes)
find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.log/logger.log/g'
```

**Note**: Always review automated replacements before committing.

