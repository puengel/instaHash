import * as React from 'react';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import { any } from 'prop-types';

interface HomeProps {
}

interface HomeState {
  posts: any[];
  gw: number;
  gh: number;
  gridsize: number;
}

const client = new W3CWebSocket(`ws://${window.location.hostname}:8080/posts`);

class Home extends React.Component<HomeProps, HomeState> {

  constructor(props: HomeProps) {
    super(props);

    let w = Math.floor(window.innerWidth / 600);
    let h = Math.floor(window.innerHeight / 300);

    this.state = {
      posts: [],
      gw: w,
      gh: h,
      gridsize: w * h,
    }
  }

  componentDidMount() {
    client.onopen = () => {
      console.log('WebSocket Client Connected');

      client.send(JSON.stringify({ "Event": "posts", "Data": "50" }));
    };
    client.onmessage = (message) => {
      console.log(message);
      let parsed = JSON.parse(message.data);
      switch (parsed.Event) {
        case "posts":
          console.log("got posts");
          console.log(parsed.Data);
          parsed.Data.sort((a: any, b: any) => {
            return b.node.taken_at_timestamp - a.node.taken_at_timestamp;
          })
          this.setState({
            posts: parsed.Data
          });
          break;
        case "post":
          console.log("new post");
          this.state.posts.push(parsed.Data);
          this.state.posts.sort((a, b) => {
            return b.node.taken_at_timestamp - a.node.taken_at_timestamp;
          })
          this.setState((state) => ({
            posts: state.posts
          }));
          break;
        default:
          console.log(`Unknown event: ${parsed.Event}`);
      }
    };
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
          posts.map((post: any, idx: number) => {
            if (idx >= this.state.gridsize) {
              return
            }
            console.log(post);
            // console.log(post.node.edge_media_to_caption.edges[0].node.text);
            if (post.node === undefined) {
              return (
                <div className="col" style={{ width: colW, height: colH }} key={idx}>Nothing</div>
              );
            }

            return (
              <div className="col" style={{ width: colW, height: colH }} key={idx} >
                {
                  (!post.node.is_video && post.node.display_url && (!post.node.edge_sidecar_to_children || !post.node.edge_sidecar_to_children.edges)) ? (
                    <div className="col-img" style={{ backgroundImage: `url(${post.node.display_url})` }}></div>

                  ) : (
                      <div className="col-inner">
                        {
                          (post.node.edge_sidecar_to_children && post.node.edge_sidecar_to_children.edges) ? (
                            <div className="col-img-multi-container">
                              {
                                setTimeout(() => {
                                  this.carousel(1, `slide-img-${idx}`);
                                }, 10000) &&
                                post.node.edge_sidecar_to_children && post.node.edge_sidecar_to_children.edges.map((edge: any, urlIdx: number) => {
                                  return (
                                    <div className={`col-img-multi slide-img-${idx}${urlIdx === 0 ? " show" : ""}`} style={{ backgroundImage: `url(${edge.node.display_url})` }} key={urlIdx}></div>
                                  );
                                })

                              }
                            </div>
                          ) :
                            (
                              <video preload="auto" playsInline muted autoPlay controls={false} loop className="col-vid" poster={post.node.display_url}>
                                {
                                  post.node.video_resources &&
                                  post.node.video_resources.map((res: any) => {
                                    return (
                                      <source src={res.src} key={res.src} />
                                    )
                                  })
                                }
                              </video>
                            )
                        }


                      </div>
                    )
                }
                <div className="info">
                  <div className="post-author" >
                    <div className="post-author-pic" style={{ backgroundImage: `url(${post.node.owner.profile_pic_url})` }}></div>
                    <div className="post-author-name">{post.node.owner.username}</div>
                  </div>
                  <div className="text">

                    {/* <p className="text-p text-no-highlight" > */}
                    {
                      post.node && post.node.edge_media_to_caption &&
                      post.node.edge_media_to_caption.edges && post.node.edge_media_to_caption.edges[0] &&
                      post.node.edge_media_to_caption.edges[0].node && post.node.edge_media_to_caption.edges[0].node.text &&
                      post.node.edge_media_to_caption.edges[0].node.text.split("#").map((splitByHash: string, textKey: number) => {
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
