import * as React from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import Page, { GetHashPage } from 'routes';

interface HomeProps extends RouteComponentProps {

}

interface HomeState {
}

class Home extends React.Component<HomeProps, HomeState> {

  private searchTag: string;

  constructor(props: HomeProps) {
    super(props);
    this.searchTag = "SVV";
  }

  private submit() {
    // console.log("Submit");
    if (this.searchTag !== "") {
      this.props.history.push(GetHashPage(Page.TAG, this.searchTag));
    }
  }

  render() {
    return (
      <div className="home-container">
        <div className="home-center">
          <h1 className="home-header">InstaHash</h1>
          <input id="textfield" className="home-input"
            autoFocus
            onClick={(item) => {
              item.currentTarget.select();
            }}
            defaultValue={this.searchTag}
            onKeyUp={(e) => {
              if (e.keyCode === 13) {
                // console.log("enter");
                this.submit();
              }
            }}
            onChange={(item) => {
              let value = item.currentTarget.value;
              // console.log(value);
              this.searchTag = value;
            }} />
          <button
            className="home-button"
            onClick={() => {
              // console.log("button click");
              this.submit();
            }
            } >Go</button>
        </div>
      </div>
    )
  }
}

const comp = withRouter(Home)

export { comp as Home }
