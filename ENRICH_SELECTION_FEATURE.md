# Feature: Manual Participant Selection for Data Enrichment

## Overview

Modified the "Enrich Data via SAS" feature to require manual selection of participants instead of automatically processing all incomplete records.

## Changes Made

### 1. Frontend (`pages/admin/participants.tsx`)

#### Added State Management

```typescript
const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
const [selectAll, setSelectAll] = useState(false);
```

#### New Handler Functions

- **`handleOpenEnrichModal()`**: Opens modal and resets selections
- **`handleSelectAll()`**: Toggles selection of all participants in current page
- **`handleSelectParticipant(id)`**: Toggles individual participant selection

#### UI Enhancements

- Added checkbox in table header for "select all"
- Added checkbox in each participant row for individual selection
- Modal shows count of selected participants
- "Iniciar Enriquecimento" button disabled when no participants selected
- Warning message when modal opened with no selections
- Selections cleared after successful enrichment

### 2. Backend (`pages/api/admin/enrich-participants.js`)

#### API Changes

**Before:**

```javascript
POST /api/admin/enrich-participants
Body: {
  eventId?: string,  // Optional
  limit?: number     // Default: 50
}
```

**After:**

```javascript
POST /api/admin/enrich-participants
Body: {
  participantIds: string[]  // Required array of participant IDs
}
```

#### Query Changes

**Before:** Searched for participants with incomplete data (temp emails, missing phones)

```sql
SELECT FROM participants p
WHERE (
  p.email LIKE '%@temp.com'
  OR p.telefone IS NULL
  OR p.company_id IS NULL
)
LIMIT 50
```

**After:** Processes only selected participants

```sql
SELECT FROM participants p
WHERE p.id = ANY($1)
ORDER BY p.nome
```

## User Flow

1. **Navigate to Participants Page**: `/admin/participants`
2. **Select Participants**:
   - Use checkboxes to select specific participants
   - Or click header checkbox to select all visible
3. **Click "Enriquecer Dados (SAS)" Button**
4. **Review Selection in Modal**:
   - Shows count of selected participants
   - Displays warning if none selected
   - "Iniciar Enriquecimento" button disabled if count = 0
5. **Start Enrichment Process**
6. **View Progress**: Real-time progress bar and results
7. **Completion**: Selections automatically cleared

## Validation

### Request Validation

```javascript
if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
  return res.status(400).json({
    error: 'É necessário fornecer um array de IDs de participantes',
  });
}
```

### Frontend Validation

```typescript
const handleStartEnrichment = async () => {
  if (selectedParticipants.length === 0) {
    alert('Selecione pelo menos um participante para enriquecer os dados.');
    return;
  }
  // ... proceed with enrichment
};
```

## Benefits

1. **User Control**: Operators can choose exactly which participants to enrich
2. **Efficiency**: No wasted API calls on participants that don't need updating
3. **Flexibility**: Can enrich based on custom criteria (not just incomplete data)
4. **Safety**: Preview selection before executing batch operation
5. **Better UX**: Clear visual feedback of selected participants

## Technical Notes

- Uses array-based state (`string[]`) instead of `Set<string>` for compatibility
- Checkbox state synchronized between table and modal
- Transaction-safe: All enrichments processed individually with error handling
- Maintains existing progress tracking and error reporting
- No breaking changes to other features

## Files Modified

- `pages/admin/participants.tsx` (3 new functions, UI enhancements)
- `pages/api/admin/enrich-participants.js` (query logic, parameter handling)

## Testing Checklist

- [x] Checkboxes functional (individual and select-all)
- [x] Modal shows correct count
- [x] Button disabled when no selection
- [x] API accepts participantIds array
- [x] API validates input correctly
- [x] Enrichment processes only selected
- [x] Selections cleared after success
- [x] No TypeScript compilation errors
- [ ] Manual testing: Select 2-3 participants and verify enrichment
- [ ] Manual testing: Try with empty selection (should show warning)
- [ ] Manual testing: Select all and verify all processed
