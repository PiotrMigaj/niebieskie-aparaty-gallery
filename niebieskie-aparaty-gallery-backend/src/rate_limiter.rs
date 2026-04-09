use chrono::NaiveDate;
use std::sync::Mutex;
use tracing::{debug, warn};

/// Global daily rate limiter. Counts requests per UTC day and rejects
/// any request that would exceed the configured limit.
pub struct RateLimiter {
    state: Mutex<State>,
    limit: u32,
}

struct State {
    date: NaiveDate,
    count: u32,
}

impl RateLimiter {
    pub fn new(limit: u32) -> Self {
        Self {
            state: Mutex::new(State {
                date: chrono::Utc::now().date_naive(),
                count: 0,
            }),
            limit,
        }
    }

    /// Returns true and increments the counter if the request is within the
    /// daily limit. Resets the counter automatically at UTC midnight.
    pub fn check(&self) -> bool {
        let mut state = self.state.lock().unwrap();
        let today = chrono::Utc::now().date_naive();

        if state.date != today {
            debug!(previous_date = %state.date, new_date = %today, "Rate limiter counter reset");
            state.date = today;
            state.count = 0;
        }

        if state.count >= self.limit {
            warn!(count = state.count, limit = self.limit, "Daily rate limit reached");
            return false;
        }

        state.count += 1;
        true
    }
}
