package gateway

import "errors"

type upstreamRuntimeError struct {
	err error
}

func (e upstreamRuntimeError) Error() string {
	if e.err == nil {
		return "upstream runtime failure"
	}
	return e.err.Error()
}

func (e upstreamRuntimeError) Unwrap() error {
	return e.err
}

func wrapUpstreamRuntimeError(err error) error {
	if err == nil {
		return nil
	}
	return upstreamRuntimeError{err: err}
}

func isUpstreamRuntimeFailure(err error) bool {
	var runtimeErr upstreamRuntimeError
	return errors.As(err, &runtimeErr)
}
