import * as React from 'react';
import axios from 'axios';

interface HomeProps {
  hash: string;
}

interface HomeState {
  hash: string;
  pics: any[];
  gw: number;
  gh: number;
  gridsize: number;
}

class pic {
  url: string;
  text?: string;

  constructor(url: string, text?: string) {
    this.url = url;
    this.text = text;
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

  constructor(props: HomeProps) {
    super(props);

    let w = Math.floor(window.innerWidth / 300);
    let h = Math.floor(window.innerHeight / 300);

    this.state = {
      hash: props.hash,
      pics: [],
      gw: w,
      gh: h,
      gridsize: w * h,
    }
  }

  private async loadInstaHash() {
    const { hash } = this.state;


    const url = `https://www.instagram.com/explore/tags/${hash}/?__a=1`


    axios.get(url).then((response => {
      // console.log(response);
      let data = response.data;

      let edges = data.graphql.hashtag.edge_hashtag_to_media.edges;

      for (let i = 0; i < edges.length && i < this.state.gridsize; i++) {
        console.log(edges[i].node);
        let node = edges[i].node;

        // Single Pic
        if (!node.is_video) {
          this.state.pics.push(new pic(node.display_url, node.edge_media_to_caption.edges[0].node.text));


          // Video
        } else {
          let vidReqUrl = `https://www.instagram.com/p/${node.shortcode}/`
          axios.get(vidReqUrl).then(response => {
            let vidReqData = response.data;
            let regex = /<script type="text\/javascript">window[.]_sharedData = {[\s\S]*};<\/script>/g

            let scripts = vidReqData.match(regex);
            let sharedData = JSON.parse(scripts[0].match(/\{[\s\S]*\}/g)[0]);
            console.log("vid");
            console.log(sharedData);
            let vidUrl = sharedData.entry_data.PostPage[0].graphql.shortcode_media.video_url;

            this.state.pics.push(new vid(vidUrl, node.edge_media_to_caption.edges[0].node.text));

            this.setState({
              ...this.state,
              pics: this.state.pics,
            })
          })
        }

        // this.state.pics.push(edges[i].node.display_url);
        // axios.get(edges[i].node.display_url).then(picResponse => {
        //   this.state.pics.push(response.data);
        // })
      }

      this.setState({
        ...this.state,
        pics: this.state.pics,
      })
    }));

    // request.get(url, (error, response, body) => {
    //   console.log(response);
    //   console.log(body);
    // });

    // console.log(url);
  }

  componentDidMount() {
    this.loadInstaHash();
  }

  render() {
    // console.log(this.state.hash);
    const { pics, gw, gh } = this.state;
    let colW = `calc(${Math.floor(100 / gw)}% - ${5 * gw}px)`;
    let colH = `calc(${Math.floor(100 / gh)}% - ${5 * gw}px)`;
    return (
      <div className="flex-grid">
        {
          pics.map((content: any, idx: number) => {
            console.log(idx);
            return (
              <div className="col" style={{ width: colW, height: colH }} key={idx} >
                {
                  (content instanceof pic) ? (
                    <div className="col-img" style={{ backgroundImage: `url(${content.url})` }}></div>

                  ) : (
                      <video preload="auto" autoPlay controls={false} loop className="col-vid" src={content.url}>
                        {/* <source src={content.url} type="video/mp4" ></source> */}
                      </video>
                    )
                }
              </div>
            )
          })
        }
      </div >
    )
  }
}

export { Home as Home }
