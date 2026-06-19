package checker

import (
	"sync"

	"github.com/rs/zerolog"
)

// Service dispatches a check job to the right checker based on its mode and
// runs batches with bounded concurrency. It is broker-independent and used by
// both the synchronous HTTP API and (later) the async queue worker.
type Service struct {
	log           zerolog.Logger
	defaultTarget string
	request       *RequestChecker
	crawlee       *CrawleeChecker
	playwright    *PlaywrightChecker
}

func NewService(log zerolog.Logger, timeoutSeconds int, defaultTarget string) *Service {
	if defaultTarget == "" {
		defaultTarget = "https://api.ipify.org"
	}
	return &Service{
		log:           log,
		defaultTarget: defaultTarget,
		request:       NewRequestChecker(log, timeoutSeconds),
		crawlee:       NewCrawleeChecker(log, timeoutSeconds),
		playwright:    NewPlaywrightChecker(log, timeoutSeconds),
	}
}

func (s *Service) Run(job CheckJob) CheckResult {
	if job.TargetURL == "" {
		job.TargetURL = s.defaultTarget
	}
	if job.Protocol == "" {
		job.Protocol = "http"
	}
	switch job.Mode {
	case ModePlaywright:
		return s.playwright.Check(job)
	case ModeCrawlee:
		return s.crawlee.Check(job)
	default:
		return s.request.Check(job)
	}
}

// RunBatch checks many proxies concurrently. Order of results is preserved.
func (s *Service) RunBatch(jobs []CheckJob, concurrency int) []CheckResult {
	if concurrency < 1 {
		concurrency = 20
	}
	results := make([]CheckResult, len(jobs))
	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup

	for i := range jobs {
		wg.Add(1)
		sem <- struct{}{}
		go func(idx int) {
			defer wg.Done()
			defer func() { <-sem }()
			results[idx] = s.Run(jobs[idx])
		}(i)
	}
	wg.Wait()
	return results
}
