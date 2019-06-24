import * as React from 'react';
import { Route, Switch } from 'react-router-dom';

import { Page, Routes } from './routes';
import { Hash } from './hash';
import { NotFound } from 'notFound';
import { Home } from 'home';



interface RootProps {
}

interface RootState {
}

class Root extends React.Component<RootProps, RootState> {
  constructor(props: RootProps) {
    super(props);

    this.state = {
    }

  }


  // Hint to navigate react router
  // https://stackoverflow.com/questions/31079081/programmatically-navigate-using-react-router
  render() {
    return (
      <div className="react-route">
        <Switch>
          <Route path={Routes.get(Page.TAG)} render={({ match }) => {
            // console.log(match);
            return (
              <Hash hash={match.params.hash} />)
          }} />
          <Route path={Routes.get(Page.HOME)} render={() => {
            return (
              <Home />
            )
          }} />
          <Route render={() => {
            return <NotFound />
          }} />
        </Switch>
      </div>
    )
  }
}

export { Root as Root }