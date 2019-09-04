package main

import (
	"encoding/json"
	"image"
	"io/ioutil"
	"log"
	"math/rand"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"time"

	"github.com/pkg/errors"

	"github.com/Benchkram/errz"
	"github.com/fsnotify/fsnotify"
	"github.com/gorilla/websocket"
)

//GLOBALS

const user = "230august"
const hashtag = "230august"

//
var watcher *fsnotify.Watcher

//FileWorkerPipe to handle new posts between goroutines
var FileWorkerPipe = make(chan PostJSON)

var upgrader = websocket.Upgrader{ //Upgrader for websockets
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	Subprotocols:    []string{"p0", "p1"},
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// SocketEvent event
type SocketEvent struct {
	Event string
	Data  interface{}
}

//Post struct everything that will be needed in frontend from post
type Post struct {
	Content   PostContent
	Text      string
	UserPic   image.Image
	UserName  string
	TimeStamp time.Time
}

//PostContent can be a video, a single picture or multiple pictures
type PostContent struct {
	PostContentType ContentType
	File            []*os.File
}

//ContentType bla
type ContentType = int

//Const stuff bla
const (
	Video     ContentType = 0
	SinglePic ContentType = 1
	MultiPic  ContentType = 2
)

//PostJSON I need this to marshall instaloader json files
type PostJSON struct {
	Node struct {
		Shortcode  string         `json:"shortcode"`
		ID         string         `json:"id"`
		Dimensions DimensionsJSON `json:"dimemsions"`
		TextEdge   struct {
			Edges []struct {
				Node struct {
					Text string `json:"text"`
				} `json:"node"`
			} `json:"edges"`
		} `json:"edge_media_to_caption"`
		Owner struct {
			FullName      string `json:"full_name"`
			UserName      string `json:"username"`
			ProfilePicURL string `json:"profile_pic_url"`
			ID            string `json:"id"`
		} `json:"owner"`
		TakenAtTimestamp int    `json:"taken_at_timestamp"`
		IsVideo          bool   `json:"is_video"`
		DisplayURL       string `json:"display_url"`
		Media            struct {
			Edges []struct {
				Node struct {
					Dimensions DimensionsJSON `json:"dimemsions"`
					DisplayURL string         `json:"display_url"`
					IsVideo    bool           `json:"is_video"`
				} `json:"node"`
			} `json:"edges"`
		} `json:"edge_sidecar_to_children"`
		VideoDuration  float32 `json:"video_duration"`
		ViderResources []struct {
			Height   int    `json:"config_height"`
			Width    int    `json:"config_width"`
			MimeType string `json:"mime_type"`
			Profile  string `json:"profile"`
			Src      string `json:"src"`
		} `json:"video_resources"`
	} `json:"node"`
}

//DimensionsJSON struct has width and height
type DimensionsJSON struct {
	Height int `json:"height"`
	Width  int `json:"width"`
}

//OwnerInfoJSON only owner info needed from JSON
type OwnerInfoJSON struct {
	Node struct {
		Page []struct {
			Graphql struct {
				User struct {
					FullName      string `json:"full_name"`
					UserName      string `json:"username"`
					ProfilePicURL string `json:"profile_pic_url"`
					UserID        string `json:"id"`
				} `json:"user"`
			} `json:"graphql"`
		} `json:"ProfilePage"`
	} `json:"entry_data"`
}

//UserInfoJSON :)
type UserInfoJSON struct {
	User struct {
		Username      string `json:"username"`
		ProfilePicURL string `json:"profile_pic_url"`
	} `json:"user"`
	Status string `json:"status"`
}

// type StoryJSON struct {
// }

var postBuffer = make([]PostJSON, 0)

func main() {

	// FileServer on Port 80
	go fileServer()

	// WebSocket on Port 8080
	go webSocket()

	// run instaloader once every minute
	go instaLoader()

	// Handle new Posts in FileSystem
	fileWorker()
}

// FileServer for Web Files
func fileServer() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.URL.Path)
		http.ServeFile(w, r, "./web/build/index.html")
	})

	fs := http.FileServer(http.Dir("./web/build/js/"))
	http.Handle("/js/", http.StripPrefix("/js", fs))
	cs := http.FileServer(http.Dir("./web/build/css/"))
	http.Handle("/css/", http.StripPrefix("/css", cs))

	log.Println("serve")

	err := http.ListenAndServe(":8081", nil)
	check(err)
	log.Println("end")
}

// WebSocket to send new posts
func webSocket() {
	listener, err := net.Listen("tcp", ":8080")
	check(err)

	http.HandleFunc("/posts", postSocket)

	go http.Serve(listener, nil)
}

// postSocket handleFunc
func postSocket(w http.ResponseWriter, r *http.Request) {
	var err error
	defer errz.Recover(&err)

	c, err := upgrader.Upgrade(w, r, nil)
	errz.Fatal(err)
	defer c.Close()

	//Writer
	writerTask := GORunner(func(stop StopChan, finish Finish) {
		for {
			var post PostJSON
			select {
			case post = <-FileWorkerPipe:
				log.Printf("Has Option Request")
				log.Printf("Sending Post")

				event := SocketEvent{
					Event: "post",
					Data:  post}

				err = c.WriteJSON(event)
				errz.Log(err)
			case _, ok := <-stop:
				if !ok {
					finish()
					return
				}

			}
		}
	})

	defer writerTask.Stop()
	defer writerTask.Wait()

	//Reader
	for {

		// ReadMessages
		var event SocketEvent
		_, message, err := c.ReadMessage()
		errz.Log(err, "WebSocket: [err]")

		//Handle Message
		err = json.Unmarshal(message, &event)
		errz.Fatal(err, "Unmashal: ")
		log.Printf("WebSocket: [received] %+v", event)

		//Shutdown Event
		if event.Event == "posts" {
			log.Println("Request: \"posts\"")
			// log.Println(event.Data)

			log.Println(postBuffer)

			posts := postBuffer[len(postBuffer)-20:]
			// for k, v := range postBuffer {
			// 	log.Println(k)
			// 	posts = append(posts, v)
			// }

			event := SocketEvent{
				Event: "posts",
				Data:  posts,
			}

			err = c.WriteJSON(event)
			check(err)

			// switch t := event.Data.(type) {
			// case int:
			// 	log.Printf("%d Posts requested", t)
			// 	i := 0
			// 	for k, v := range postBuffer {
			// 		if i >= len(postBuffer) || i >= t {
			// 			break
			// 		}
			// 		log.Println(k)
			// 		event := SocketEvent{
			// 			Event: "posts",
			// 			Data:  v,
			// 		}
			// 		c.WriteJSON(event)
			// 	}
			// default:
			// 	log.Println(t)
			// }
		} else {
			log.Printf("unknown event %v", event)
		}
	}

}

func fileWorker() {
	log.Println("FileWorker start")

	// creates a new file watcher
	watcher, _ = fsnotify.NewWatcher()
	defer watcher.Close()

	// starting at the root of the project, walk each file/directory searching for
	// directories
	if err := filepath.Walk("./posts", watchDir); err != nil {
		log.Println("ERROR", err)
	}

	//Sort the Posts
	sort.Slice(postBuffer, func(i, j int) bool {
		return postBuffer[i].Node.TakenAtTimestamp < postBuffer[j].Node.TakenAtTimestamp
	})

	//
	done := make(chan bool)

	//
	go func() {
		var created = make(map[string]bool)
		for {
			select {
			// watch for events
			case event := <-watcher.Events:
				log.Printf("EVENT! %#v\n", event)
				if event.Op == fsnotify.Create {
					// Add this to CreateList
					created[event.Name] = true
					log.Println("New File")
				} else if event.Op == fsnotify.Write {
					if created[event.Name] {

						fi, err := os.Stat(event.Name)
						check(err)
						post, err := newPost(event.Name, fi)
						if err == nil {
							postBuffer = append(postBuffer, post)
							FileWorkerPipe <- post
						}
						created[event.Name] = false
					}
				}
				// watch for errors
			case err := <-watcher.Errors:
				log.Println("ERROR", err)
			}
		}
	}()

	<-done
}

// watchDir gets run as a walk func, searching for directories to add watchers to
func watchDir(path string, fi os.FileInfo, err error) error {

	// re, err := regexp.Compile("(_UTC[0-9]*.[a-z]+)")
	// check(err)

	// if file add a post to the postBuffer
	if !fi.Mode().IsDir() {
		post, err := newPost(path, fi)
		if err == nil {
			postBuffer = append(postBuffer, post)
		}
	}

	// since fsnotify can watch all the files in a directory, watchers only need
	// to be added to each nested directory
	if fi.Mode().IsDir() {
		return watcher.Add(path)
	}

	return nil
}

func newPost(path string, fi os.FileInfo) (PostJSON, error) {
	var post PostJSON

	ext := filepath.Ext(path)
	switch ext {
	case ".json":
		log.Println("got .json")
		file, err := ioutil.ReadFile(path)
		check(err)
		post = PostJSON{}
		err = json.Unmarshal(file, &post)
		check(err)

		// Complete Onwer info if missing
		if post.Node.Owner.ProfilePicURL == "" || post.Node.Owner.UserName == "" {
			log.Println(post.Node.Owner)
			post.loadUserInfo()
			log.Println(post.Node.Owner)
		}

		return post, nil
	case ".png":
		// log.Println("got .png")
	case ".jpg":
		// log.Println("got .jpg")
	case ".txt":
		// log.Println("got .txt")
	case ".mp4":
		// log.Println("got .mp4")
	default:
		log.Printf("What did I get here? %v", ext)
	}
	return post, errors.New("No post file")
}

func instaLoader() {
	log.Println("Start instaloader routine")
	instaloaderPath := "../submodules/instaloader/instaloader.py"
	var argsStories []string
	var argsHashtag []string

	// GET only json metaData
	argsStories = []string{instaloaderPath, "--login=230august", ":stories", "--no-compress-json", "--no-video-thumbnails", "--no-captions", "--count=10"}
	argsHashtag = []string{instaloaderPath, "--login=230august", "#230august", "--no-compress-json", "--no-video-thumbnails", "--no-captions", "--count=10"}
	// argsStories = []string{instaloaderPath, "--login=230august", ":stories", "--no-compress-json", "--no-pictures", "--no-videos", "--no-video-thumbnails", "--no-captions", "--count=10"}
	// argsHashtag = []string{instaloaderPath, "--login=230august", "#230august", "--no-compress-json", "--no-pictures", "--no-videos", "--no-video-thumbnails", "--no-captions", "--count=10"}

	for {

		// Round 1 get Stories
		cmdStory := exec.Command("python3.6", argsStories...)
		cmdStory.Stdout = os.Stdout
		cmdStory.Stderr = os.Stderr
		cmdStory.Dir = "./posts"
		err := cmdStory.Start()
		check(err)
		err = cmdStory.Wait()
		check(err)

		// Round 2 get Hashtag
		cmdHashtag := exec.Command("python3.6", argsHashtag...)
		cmdHashtag.Stdout = os.Stdout
		cmdHashtag.Stderr = os.Stderr
		cmdHashtag.Dir = "./posts"
		err = cmdHashtag.Start()
		check(err)
		err = cmdHashtag.Wait()
		check(err)

		// Round 3 get profiles
		// cmdProfile := exec.Command("python3.6", argsProfiles...)
		// cmdProfile.Stdout = os.Stdout
		// cmdProfile.Stderr = os.Stderr
		// cmdProfile.Dir = "./profiles"
		// err = cmdProfile.Start()
		// check(err)
		// err = cmdProfile.Wait()
		// check(err)

		// Wait for next execution randomize to be sth around 60s
		sleepTime := time.Duration(50+rand.Int63n(20)) * time.Second
		log.Printf("Waitduration: %d", sleepTime)
		time.Sleep(sleepTime)

	}
}

func (post *PostJSON) getOwnerInfo() error {
	re := regexp.MustCompile(`<script type="text/javascript">window[.]_sharedData = {[\s\S]*};</script>`)
	// regex := /<script type="text\/javascript">window[.]_sharedData = {[\s\S]*};<\/script>/g
	if post.Node.Shortcode == "" {
		return errors.New("Shortcode missing")
	}

	postURL := `https://www.instagram.com/p/` + post.Node.Shortcode + "/"
	log.Println(postURL)
	resp, err := http.Get(postURL)
	if err != nil {
		return errors.Wrap(err, "Instagram get request failed")
	}

	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)

	sharedData := re.FindStringSubmatch(string(body))

	if len(sharedData) < 1 {
		return errors.New("Post missing")
		// log.Println(re)
		// log.Println(string(body))
		// log.Println(sharedData)
	}

	re1 := regexp.MustCompile(`\{[\s\S]*\}`)

	jsonString := re1.FindStringSubmatch(sharedData[0])

	onwerInfo := OwnerInfoJSON{}

	log.Println(jsonString[0])

	err = json.Unmarshal([]byte(jsonString[0]), &onwerInfo)

	log.Println(onwerInfo)

	if err != nil {
		errors.Wrap(err, "getOwnerInfo could not unmarshal request body")
	}

	// log.Println(post.Node.Owner)

	post.Node.Owner.FullName = onwerInfo.Node.Page[0].Graphql.User.FullName
	post.Node.Owner.UserName = onwerInfo.Node.Page[0].Graphql.User.UserName
	post.Node.Owner.ProfilePicURL = onwerInfo.Node.Page[0].Graphql.User.ProfilePicURL

	return nil
}

func (post *PostJSON) loadUserInfo() error {
	log.Println("Start loadUserInfo")

	loadURL := `https://i.instagram.com/api/v1/users/` + post.Node.Owner.ID + `/info/`

	resp, err := http.Get(loadURL)
	if err != nil {
		return errors.Wrap(err, "Instagram api get request failed")
	}

	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)

	userInfo := UserInfoJSON{}

	err = json.Unmarshal(body, &userInfo)

	if userInfo.Status == "ok" {
		post.Node.Owner.UserName = userInfo.User.Username
		post.Node.Owner.ProfilePicURL = userInfo.User.ProfilePicURL
	} else {
		post.Node.Owner.UserName = "230august"
		post.Node.Owner.ProfilePicURL = "https://instagram.fbkk9-2.fna.fbcdn.net/vp/7fe0496b9438def60d00bf531c63a65f/5DCB27F1/t51.2885-19/44884218_345707102882519_2446069589734326272_n.jpg?_nc_ht=instagram.fbkk9-2.fna.fbcdn.net"
	}

	return nil
}
