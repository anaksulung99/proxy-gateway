// Throwaway local upstream HTTP proxy for gateway verification (:7000).
package main

import (
	"io"
	"log"
	"net"
	"net/http"
	"time"
)

func main() {
	s := &http.Server{Addr: "127.0.0.1:7000", Handler: http.HandlerFunc(handle)}
	log.Println("test upstream proxy on 127.0.0.1:7000")
	log.Fatal(s.ListenAndServe())
}

func handle(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodConnect {
		dst, err := net.DialTimeout("tcp", r.Host, 15*time.Second)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}
		hj := w.(http.Hijacker)
		c, _, _ := hj.Hijack()
		c.Write([]byte("HTTP/1.1 200 Connection established\r\n\r\n"))
		go io.Copy(dst, c)
		io.Copy(c, dst)
		return
	}
	r.RequestURI = ""
	resp, err := http.DefaultTransport.RoundTrip(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	for k, vv := range resp.Header {
		for _, v := range vv {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
