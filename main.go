package main

import (
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.URL.Path)
		http.ServeFile(w, r, "./web/build/index.html")
	})

	fs := http.FileServer(http.Dir("./web/build/js/"))
	http.Handle("/js/", http.StripPrefix("/js", fs))
	cs := http.FileServer(http.Dir("./web/build/css/"))
	http.Handle("/css/", http.StripPrefix("/css", cs))

	log.Println("serve")

	err := http.ListenAndServe(":8080", nil)
	check(err)
	log.Println("end")
}

func check(err error) {
	if err != nil {
		log.Println(err)
	}
}
