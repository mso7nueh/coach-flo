-- История изменения целевого значения метрики тела
CREATE TABLE IF NOT EXISTS body_metric_target_history (
    id VARCHAR(36) PRIMARY KEY,
    metric_id VARCHAR(36) NOT NULL,
    target_value DOUBLE PRECISION NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    FOREIGN KEY (metric_id) REFERENCES body_metrics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_body_metric_target_history_metric_id ON body_metric_target_history(metric_id);
CREATE INDEX IF NOT EXISTS idx_body_metric_target_history_changed_at ON body_metric_target_history(changed_at);

COMMENT ON TABLE body_metric_target_history IS 'История изменения целевого значения метрики тела';
