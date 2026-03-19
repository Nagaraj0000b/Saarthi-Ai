# Data Management API

These endpoints manage the core business data: earnings and work logs.

## Earnings API

### Get Earnings
`GET /api/earnings`

Retrieves a history of earnings entries.
-   **Sort:** Descending by date.
-   **Filter:** Scoped to the authenticated user.

### Add Earning
`POST /api/earnings`

Records a new financial entry.

**Body:**
```json
{
  "platform": "Uber",
  "amount": 1500,
  "hours": 8,
  "date": "2023-10-27T10:00:00Z"
}
```

## Work Logs API

### Get Work Logs
`GET /api/worklogs`

Retrieves historical shift data.

### Add Work Log
`POST /api/worklogs`

Logs a completed shift.

**Body:**
```json
{
  "platform": "Swiggy",
  "hours": 5.5,
  "notes": "Heavy rain, high surge pricing today.",
  "date": "2023-10-27T14:30:00Z"
}
```

## Models

### `EarningsEntry`
-   `userId`: ObjectId (Ref: User)
-   `platform`: Enum (`Uber`, `Swiggy`, `Rapido`, `Other`)
-   `amount`: Number
-   `hours`: Number
-   `date`: Date

### `WorkLog`
-   `userId`: ObjectId (Ref: User)
-   `platform`: Enum
-   `hours`: Number
-   `notes`: String
-   `date`: Date
