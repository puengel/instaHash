import * as React from 'react';
import * as ReactDOM from "react-dom";
import { Root } from 'root';
import { BrowserRouter as Router } from 'react-router-dom';

const id = "reactRoot";
let body = document.getElementsByTagName("body")[0];
console.log(body);
let reactRoot = document.createElement("div");
reactRoot.setAttribute("style", "width:100%;height:100%");
reactRoot.id = id;
body.appendChild(reactRoot);

ReactDOM.render(
  <Router >
    <Root />
  </Router>
  ,
  document.getElementById(id)
)
