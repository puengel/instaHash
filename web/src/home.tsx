import * as React from 'react';
import axios from 'axios';

interface HomeProps {
  hash: string;
}

interface HomeState {
  hash: string;
  pics: string[];
  gw: number;
  gh: number;
  gridsize: number;
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
        this.state.pics.push(edges[i].node.display_url);
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
          pics.map((pic: string, idx: number) => {

            return (
              <div className="col" style={{ backgroundImage: `url(${pic})`, width: colW, height: colH }} key={idx} ></div>
            )
          })
        }
      </div>
    )
  }
}

export { Home as Home }
