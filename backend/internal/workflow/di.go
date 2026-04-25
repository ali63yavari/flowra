package workflow

type InjectableStep interface {
	SetRuntime(runtime *Runtime)
}
