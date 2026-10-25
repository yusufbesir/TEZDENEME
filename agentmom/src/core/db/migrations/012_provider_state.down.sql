-- Down for 012 drops the provider on/off table (explicit rollback only; yazan: Claude [İP:AgentMom Faz 11 D3]).
DROP TRIGGER IF EXISTS provider_state_no_delete;
DROP TABLE IF EXISTS provider_state;
