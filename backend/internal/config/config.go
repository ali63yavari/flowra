package config

import (
	"bufio"
	"os"
	"strings"
)

type Config struct {
	DatabaseDSN      string
	RedisAddr        string
	RedisQueue       string
	Port             string
	AllowedOrigins   string
	SecretKey        string
	SeedTenantID     string
	SeedTenantName   string
	SeedTenantAPIKey string
}

func Load() Config {
	loadEnvFiles(".env", "backend/.env")
	return Config{
		DatabaseDSN:      env("DATABASE_DSN", "postgres://user:pass@localhost:5432/flowra?sslmode=disable"),
		RedisAddr:        env("REDIS_ADDR", "localhost:6379"),
		RedisQueue:       env("REDIS_QUEUE", "flowra_jobs"),
		Port:             env("PORT", "3000"),
		AllowedOrigins:   env("CORS_ALLOWED_ORIGINS", "http://localhost:3000"),
		SecretKey:        os.Getenv("FLOWRA_SECRET_KEY"),
		SeedTenantID:     os.Getenv("FLOWRA_SEED_TENANT_ID"),
		SeedTenantName:   os.Getenv("FLOWRA_SEED_TENANT_NAME"),
		SeedTenantAPIKey: os.Getenv("FLOWRA_SEED_API_KEY"),
	}
}

func (c Config) ListenAddr() string {
	return ":" + c.Port
}

func (c Config) HasSeedTenant() bool {
	return c.SeedTenantID != "" && c.SeedTenantAPIKey != ""
}

func env(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func loadEnvFiles(paths ...string) {
	for _, path := range paths {
		loadEnvFile(path)
	}
}

func loadEnvFile(path string) {
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}
		key = strings.TrimSpace(key)
		if key == "" || os.Getenv(key) != "" {
			continue
		}
		os.Setenv(key, strings.Trim(strings.TrimSpace(value), `"'`))
	}
}
