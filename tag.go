package main

import (
	"log"
	"net/http"
)

func tag(tag string) error {
	res, err := http.Get("http://www.instagram.com/explore/tags/svvaihingen/")
	if err != nil {
		log.Println(err)
	}

	log.Println(res)

	return nil
}
