# Requirements Document

## Introduction

This feature adds the ability to delete a POC Session from the sessions list page. Currently, users can create and edit sessions but cannot remove them. The delete functionality will include a confirmation dialog to prevent accidental deletions, backend support through the existing data API, and client-side state cleanup after successful deletion.

## Glossary

- **Session_Delete_Button**: The UI control (button or menu action) on the sessions list page that initiates the delete workflow for a specific POC session.
- **Confirmation_Dialog**: A modal dialog that requires explicit user confirmation before the system proceeds with deleting a session.
- **Data_API**: The Next.js API route at `/api/data` that handles CRUD operations for all entities including sessions.
- **Data_Provider**: The client-side React context (`DataProvider` in `lib/store.tsx`) that manages application state including the sessions array.
- **POC_Session**: A project oversight committee session record stored in the `poc_sessions` table, which may have related `SessionProject` records.
- **Authorization_System**: The role-based access control system defined in `lib/rules.ts` that determines which users can perform specific actions.

## Requirements

### Requirement 1: Delete Button Visibility

**User Story:** As a POC Chair or Admin, I want to see a delete option for each session on the sessions list page, so that I can remove sessions that are no longer needed.

#### Acceptance Criteria

1. WHILE the current user has the DELETE_SESSION permission, THE Session_Delete_Button SHALL be visible within each session card on the sessions list page, regardless of the session's status (DRAFT, IN_PROGRESS, or COMPLETED).
2. WHILE the current user does not have the DELETE_SESSION permission, THE Session_Delete_Button SHALL not be rendered in the UI.
3. THE Authorization_System SHALL grant DELETE_SESSION permission to users with the POC_CHAIR or ADMIN role.
4. THE Session_Delete_Button SHALL include an accessible label that identifies the action and the associated session.

### Requirement 2: Deletion Confirmation

**User Story:** As a user with delete permission, I want to be asked for confirmation before a session is deleted, so that I do not accidentally remove session data.

#### Acceptance Criteria

1. WHEN the user activates the Session_Delete_Button, THE Confirmation_Dialog SHALL be displayed as a modal overlay containing a warning message that states the session will be permanently deleted and the action cannot be undone.
2. WHEN the user confirms the deletion in the Confirmation_Dialog, THE Data_Provider SHALL initiate the delete operation for the selected session.
3. WHEN the user cancels the Confirmation_Dialog or presses the Escape key, THE system SHALL close the dialog and leave the session unchanged.
4. THE Confirmation_Dialog SHALL identify the session being deleted by displaying the committee type and date.
5. WHILE the Confirmation_Dialog is open, THE system SHALL prevent interaction with the underlying page content until the user confirms or cancels.

### Requirement 3: Backend Delete Operation

**User Story:** As the system, I want to support a delete action for sessions through the data API, so that session records and their related data are permanently removed from the database.

#### Acceptance Criteria

1. WHEN the Data_API receives a POST request with entity "session" and action "delete" containing a session ID in the data payload, THE Data_API SHALL delete the POC_Session record with the specified ID and return a JSON response with a success indicator.
2. WHEN the Data_API deletes a POC_Session, THE database SHALL cascade-delete all related SessionProject records associated with that session.
3. IF the specified session ID does not exist in the database, THEN THE Data_API SHALL return a 404 response with a JSON body containing an error message indicating the session was not found.
4. IF the Authorization header is missing, malformed, or contains an invalid JWT token, THEN THE Data_API SHALL return a 401 response and SHALL NOT process the delete operation.
5. IF the delete request is missing the session ID in the data payload, THEN THE Data_API SHALL return a 400 response with a JSON body containing a validation error message indicating the missing field.

### Requirement 4: Client-Side State Update

**User Story:** As a user, I want the sessions list to update immediately after I delete a session, so that the UI reflects the current state without requiring a page refresh.

#### Acceptance Criteria

1. WHEN the Data_API responds with a success status (HTTP 200) to the delete request, THE Data_Provider SHALL remove the deleted session from the local sessions array so that the session is no longer rendered in the sessions list.
2. WHEN the Data_API responds with a success status to the delete request, THE system SHALL close the Confirmation_Dialog and display a success toast notification within 1 second of receiving the response.
3. IF the delete request fails due to a network error or a non-success HTTP response, THEN THE system SHALL display an error toast notification indicating that the deletion was unsuccessful, close the Confirmation_Dialog, and leave the sessions array unchanged.
4. WHILE the delete request is in-flight, THE system SHALL disable the confirm and cancel buttons in the Confirmation_Dialog to prevent duplicate submissions.

### Requirement 5: Delete Permission Integration

**User Story:** As a system administrator, I want the delete permission to follow the same role-based access pattern as session creation, so that only authorized users can remove sessions.

#### Acceptance Criteria

1. THE Authorization_System SHALL define a DELETE_SESSION action that grants permission to users with the POC_CHAIR or ADMIN role.
2. THE Data_Provider SHALL expose a `deleteSession` function that accepts a session ID as a string parameter, removes the matching session from the local sessions array, persists the deletion via the Data_API using entity "session" and action "delete", and returns a boolean indicating whether the operation succeeded.
3. IF the Data_API returns a failure response when `deleteSession` is called, THEN THE Data_Provider SHALL leave the local sessions array unchanged and return false.
