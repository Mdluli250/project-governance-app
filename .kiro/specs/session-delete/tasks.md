# Implementation Plan: Session Delete

## Overview

Add the ability to delete POC Sessions from the sessions list page. This involves extending the authorization system with a `DELETE_SESSION` action, adding a delete handler to the data API, creating a confirmation dialog component, wiring up client-side state management, and integrating the delete button into the sessions page.

## Tasks

- [x] 1. Extend authorization and data layer
  - [x] 1.1 Add DELETE_SESSION permission to the authorization system
    - Add `"DELETE_SESSION"` to the action union type in `canPerformAction` in `lib/rules.ts`
    - Implement the case to return `true` for `POC_CHAIR` and `ADMIN` roles
    - _Requirements: 1.3, 5.1_

  - [x] 1.2 Add delete action support to the data API route
    - Add `"delete"` to the `VALID_ACTIONS` array in `app/api/data/route.ts`
    - Add a `delete` case within the `session` entity handler that:
      - Checks for existing session with `prisma.pocSession.findUnique`
      - Returns 404 if session not found
      - Calls `prisma.pocSession.delete({ where: { id: data.id } })` which cascade-deletes SessionProject records
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 1.3 Add deleteSession function to the DataProvider
    - Add `deleteSession: (id: string) => Promise<boolean>` to the `DataContextType` interface in `lib/store.tsx`
    - Implement the function using `fetch` to POST `{ entity: "session", action: "delete", data: { id } }` to `/api/data`
    - On success (HTTP 200): remove the session from local `sessions` state via `setSessions`, return `true`
    - On failure: leave sessions array unchanged, return `false`
    - Expose `deleteSession` in the `DataContext.Provider` value
    - _Requirements: 4.1, 5.2, 5.3_

  - [x] 1.4 Write property test for DELETE_SESSION permission (Property 1)
    - **Property 1: DELETE_SESSION permission is role-exclusive**
    - Generate random users with all possible roles (PM, POC_CHAIR, POC_MEMBER, ADMIN), verify `canPerformAction(user, "DELETE_SESSION")` returns `true` only for POC_CHAIR and ADMIN
    - **Validates: Requirements 1.1, 1.2, 1.3, 5.1**

- [x] 2. Checkpoint - Ensure authorization and API changes compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement confirmation dialog and sessions page integration
  - [x] 3.1 Create the DeleteSessionDialog component
    - Create `components/sessions/delete-session-dialog.tsx`
    - Use the existing `AlertDialog` components from `components/ui/alert-dialog.tsx`
    - Accept props: `session: POCSession`, `open: boolean`, `onOpenChange: (open: boolean) => void`
    - Display committee type label and formatted date to identify the session
    - Show a permanent deletion warning message
    - Include Cancel and Delete buttons; disable both while request is in-flight
    - Call `deleteSession` from `useData()` on confirm
    - Show success toast via `sonner` on success, error toast on failure
    - Close dialog after operation completes (success or failure)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.2, 4.3, 4.4_

  - [x] 3.2 Integrate delete button into the sessions list page
    - In `app/(dashboard)/sessions/page.tsx`, import `Trash2` from `lucide-react` and `DeleteSessionDialog`
    - Add state for tracking which session is selected for deletion and dialog open state
    - Render a delete button (Trash2 icon) on each session card, visible only when `canPerformAction(currentUser, "DELETE_SESSION")` returns `true`
    - Set `aria-label` to `"Delete {committeeType} session on {date}"` for accessibility
    - Wire the button to open the `DeleteSessionDialog` for the selected session
    - Import and use `deleteSession` from `useData()`
    - _Requirements: 1.1, 1.2, 1.4, 2.1_

  - [x] 3.3 Write property test for successful deletion state update (Property 2)
    - **Property 2: Successful deletion removes session from state**
    - Generate random sessions arrays and pick a random session ID present in the array, mock a successful API response, verify `deleteSession(id)` removes exactly that session and returns `true`
    - **Validates: Requirements 4.1, 5.2**

  - [x] 3.4 Write property test for failed deletion state preservation (Property 3)
    - **Property 3: Failed deletion preserves state**
    - Generate random sessions arrays, mock failed API responses (network error or non-200), verify `deleteSession(id)` leaves the array unchanged (deep equality) and returns `false`
    - **Validates: Requirements 4.3, 5.3**

  - [x] 3.5 Write unit tests for DeleteSessionDialog and sessions page integration
    - Test that the dialog renders with correct session identification (committee type + date)
    - Test that the delete button has accessible `aria-label`
    - Test that buttons are disabled while delete is in-flight
    - Test that dialog closes on cancel without triggering deletion
    - Test success and error toast display
    - _Requirements: 2.1, 2.3, 2.4, 4.2, 4.3, 4.4_

- [x] 4. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The cascade deletion of SessionProject records is handled by the existing Prisma schema `onDelete: Cascade` — no migration needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["3.5"] }
  ]
}
```
