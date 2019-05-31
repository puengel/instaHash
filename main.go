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
	// http.Handle("/", fs)

	// router := gin.Default()
	// router.Use(static.Serve("/", static.LocalFile("./web/build", false)))

	// api := router.Group("/api")
	// {
	// 	api.GET("/", func(c *gin.Context) {
	// 		c.JSON(http.StatusOK, gin.H{
	// 			"message": "pong",
	// 		})
	// 	})
	// }

	log.Println("serve")
	// router.Run(":8080")

	err := http.ListenAndServe(":8080", nil)
	check(err)
	log.Println("end")
}

func check(err error) {
	if err != nil {
		log.Println(err)
	}
}
