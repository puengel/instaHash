import * as React from 'react';
import axios from 'axios';

interface HomeProps {
  hash: string;
}

interface HomeState {
  hash: string;
  posts: Post[];
  gw: number;
  gh: number;
  gridsize: number;
}

class Post {
  id: string;
  timestamp: number;
  raw: any;
  content?: pic | vid | multiPic;
  username?: string;
  userPic?: string;

  constructor(id: string, timestamp: number, raw: any) {
    this.id = id;
    this.timestamp = timestamp;
    this.raw = raw;
  }

  async getData() {
    let node = this.raw;

    // Pic
    if (!node.is_video) {
      let picReqUrl = `https://www.instagram.com/p/${node.shortcode}/`
      let response = await axios.get(picReqUrl);
      if (response) {
        let picReqData = response.data;
        let regex = /<script type="text\/javascript">window[.]_sharedData = {[\s\S]*};<\/script>/g

        let scripts = picReqData.match(regex);
        let sharedData = JSON.parse(scripts[0].match(/\{[\s\S]*\}/g)[0]);

        let shortcode_media = sharedData.entry_data.PostPage[0].graphql.shortcode_media;

        // Is Multipic
        if (shortcode_media.edge_sidecar_to_children) {
          let picUrls = [];
          for (let edgeIndex = 0; edgeIndex < shortcode_media.edge_sidecar_to_children.edges.length; edgeIndex++) {
            picUrls.push(shortcode_media.edge_sidecar_to_children.edges[edgeIndex].node.display_url);
          }
          // this.state.pics.push(new multiPic(picUrls, shortcode_media.edge_media_to_caption.edges[0].node.text));
          this.content = new multiPic(picUrls, shortcode_media.edge_media_to_caption.edges[0].node.text);

          // Is Singlepic
        } else {
          // this.state.pics.push(new pic(node.display_url, node.edge_media_to_caption.edges[0].node.text));
          this.content = new pic(node.display_url, node.edge_media_to_caption.edges[0].node.text);
        }

        this.username = shortcode_media.owner.username;
        this.userPic = shortcode_media.owner.profile_pic_url;

        // console.log(sharedData);
      }

      // Video
    } else {
      let vidReqUrl = `https://www.instagram.com/p/${node.shortcode}/`
      let response = await axios.get(vidReqUrl);
      if (response) {
        let vidReqData = response.data;
        let regex = /<script type="text\/javascript">window[.]_sharedData = {[\s\S]*};<\/script>/g

        let scripts = vidReqData.match(regex);
        let sharedData = JSON.parse(scripts[0].match(/\{[\s\S]*\}/g)[0]);

        let shortcode_media = sharedData.entry_data.PostPage[0].graphql.shortcode_media;
        // console.log("vid");
        // console.log(sharedData);
        let vidUrl = shortcode_media.video_url;

        // this.state.pics.push(new vid(vidUrl, node.edge_media_to_caption.edges[0].node.text));
        this.content = new vid(vidUrl, node.edge_media_to_caption.edges[0].node.text);


        this.username = shortcode_media.owner.username;
        this.userPic = shortcode_media.owner.profile_pic_url;
      }
    }

    return true;
  }
}

class pic {
  url: string;
  text?: string;

  constructor(url: string, text?: string) {
    this.url = url;
    this.text = text;
  }

}

class multiPic {
  urls: string[];
  text?: string;

  constructor(urls: string[], text?: string) {
    this.urls = urls;
    this.text = text;
  }

  public getBackgroundImages = () => {
    let result = `url(${this.urls[0]})`
    for (let i = 1; i < this.urls.length; i++) {
      result = result + `, url(${this.urls[i]})`
    }
    console.log(result);
    return result;
  }

  public getBackgroundPosition = (offset: string) => {
    let result = `0 0`;
    for (let i = 1; i < this.urls.length; i++) {
      result = result + `, calc(offset * ${i}) 0`
    }
    console.log(result);
    return result;
  }
}

class vid {
  url: string;
  text?: string;

  constructor(url: string, text?: string) {
    this.url = url;
    this.text = text;
  }
}

class Home extends React.Component<HomeProps, HomeState> {
  lastHash: any;

  constructor(props: HomeProps) {
    super(props);

    let w = Math.floor(window.innerWidth / 600);
    let h = Math.floor(window.innerHeight / 300);

    this.lastHash = undefined;

    this.state = {
      hash: props.hash,
      posts: [],
      gw: w,
      gh: h,
      gridsize: w * h,
    }
  }

  private async loadInstaHash() {
    const { hash } = this.state;


    const url = `https://www.instagram.com/explore/tags/${hash}/?__a=1`


    let response = await axios.get(url);
    if (response) {

      // console.log(response);
      let data = response.data;

      let posts = [];

      let edges = data.graphql.hashtag.edge_hashtag_to_media.edges;
      //Is there a better way for this shitty hack?
      for (let c = 0; c < this.state.gridsize; c++) {
        let loadedPost = this.state.posts.find((element) => {
          return element.id === edges[c].node.id;
        })
        posts.push(
          loadedPost !== undefined ?
            loadedPost :
            new Post(edges[c].node.id, edges[c].node.taken_at_timestamp, edges[c].node));
      }

      posts.sort((a, b) => { return b.timestamp - a.timestamp; });

      let shownPosts = posts.slice(0, this.state.gridsize);


      for (let i = 0; i < shownPosts.length; i++) {
        if (shownPosts[i].content === undefined) {
          await shownPosts[i].getData();

          // trigger draw after every new post
          this.setState({
            ...this.state,
            posts: shownPosts,
          });
        }
      }


      // console.log(shownPosts);

    }

    setTimeout(() => { this.loadInstaHash(); }, 60000);
  }

  componentDidMount() {
    this.loadInstaHash();
  }

  carousel = (index: number, sliderClass: string) => {
    var i;
    var x = document.getElementsByClassName(sliderClass);
    if (x.length === 0) {
      return;
    }
    for (i = 0; i < x.length; i++) {
      x[i].classList.remove("show");
    }
    index++;
    if (index > x.length) { index = 1 }

    x[index - 1].classList.add("show");
    setTimeout(() => { this.carousel(index, sliderClass); }, 10000); // Change image every 2 seconds
  }

  render() {
    // console.log(this.state.hash);
    const { posts, gw, gh } = this.state;
    let colW = `calc(${Math.floor(100 / gw)}% - 10px)`;
    let colH = `calc(${Math.floor(100 / gh)}% - 10px)`;
    return (
      <div className="flex-grid">
        {
          posts.map((post: Post, idx: number) => {
            if (post.content === undefined) {
              return (
                <div className="col" style={{ width: colW, height: colH }} key={idx}></div>
              );
            }

            return (
              <div className="col" style={{ width: colW, height: colH }} key={idx} >
                {
                  (post.content instanceof pic) ? (
                    <div className="col-img" style={{ backgroundImage: `url(${post.content.url})` }}></div>

                  ) : (
                      <div className="col-inner">
                        {
                          (post.content instanceof multiPic) ? (
                            <div className="col-img-multi-container">
                              {
                                setTimeout(() => {
                                  this.carousel(1, `slide-img-${idx}`);
                                }, 10000) &&
                                post.content.urls.map((url, urlIdx) => {
                                  return (
                                    <div className={`col-img-multi slide-img-${idx}${urlIdx === 0 ? " show" : ""}`} style={{ backgroundImage: `url(${url})` }} key={urlIdx}></div>
                                  );
                                })

                              }
                            </div>
                          ) :
                            (
                              <video preload="auto" playsInline muted autoPlay controls={false} loop className="col-vid" src={post.content.url}>
                              </video>
                            )
                        }


                      </div>
                    )
                }
                <div className="info">
                  <div className="post-author" >
                    <div className="post-author-pic" style={{ backgroundImage: `url(${post.userPic})` }}></div>
                    <div className="post-author-name">{post.username}</div>
                  </div>
                  <div className="text">

                    {/* <p className="text-p text-no-highlight" > */}
                    {
                      post.content !== undefined && post.content.text !== undefined &&
                      post.content.text.split("#").map((splitByHash, textKey) => {
                        if (textKey === 0) {
                          return (
                            <p className="text-p text-no-highlight" key={textKey}>
                              {splitByHash}
                            </p>
                          )
                        }
                        let splits = splitByHash.split(" ", 1);
                        return (
                          <p className="text-p text-no-highlight" key={textKey}>
                            <a href={`${window.location.origin}/tag/${splits[0]}`} >
                              {`#${splits[0]} `}
                            </a>
                            {` ${splits.slice(1).join(" ")}`}
                          </p>
                          // {
                          //   splits[1:]
                          // }
                        )

                      })
                    }
                    {/* </p> */}

                  </div>
                </div>
              </div>
            )
          })
        }
      </div >
    )
  }
}

export { Home as Home }
