package queue

import (
	"context"
	"encoding/json"

	"github.com/redis/go-redis/v9"
)

type RedisQueue struct {
	client *redis.Client
	key    string
	dlqKey string
}

func NewRedisQueue(addr string, key string) *RedisQueue {
	rdb := redis.NewClient(
		&redis.Options{
			Addr: addr,
		},
	)

	return &RedisQueue{
		client: rdb,
		key:    key,
		dlqKey: key + "_dlq",
	}
}

func (q *RedisQueue) Publish(ctx context.Context, job Job) error {
	data, err := json.Marshal(job)
	if err != nil {
		return err
	}
	return q.client.RPush(ctx, q.key, data).Err()
}

func (q *RedisQueue) PublishToDLQ(ctx context.Context, job Job) error {
	data, err := json.Marshal(job)
	if err != nil {
		return err
	}
	return q.client.RPush(ctx, q.dlqKey, data).Err()
}

func (q *RedisQueue) Consume(
	ctx context.Context,
	handler func(context.Context, Job) error,
) error {
	for {
		res, err := q.client.BLPop(ctx, 0, q.key).Result()
		if err != nil {
			return err
		}

		var job Job
		if err := json.Unmarshal([]byte(res[1]), &job); err != nil {
			continue
		}

		_ = handler(ctx, job)
	}
}
