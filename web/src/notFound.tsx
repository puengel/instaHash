import * as React from 'react';

//import * as style from "styles.css";


interface notFoundProps {

}

interface notFoundState {
}

class NotFound extends React.Component<notFoundProps, notFoundState> {

  constructor(props: notFoundProps) {
    super(props);
  }

  render() {
    return (
      <div>
        Not Found
      </div>
    )
  }
}


export { NotFound as NotFound }
