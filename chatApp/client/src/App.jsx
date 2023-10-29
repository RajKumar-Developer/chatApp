// import Register from "./Register";
import axios from "axios";
import { UserContextProvider } from "./UserContext";
// import {useContext} from "react";
import Routes from "./Routes";
function App() {
  axios.defaults.baseURL = 'http://localhost:4000';
  axios.defaults.withCredentials = true;
  // const {username}=useContext(UserContext);
  // console.log(username)
  return (
    <UserContextProvider>
      <Routes/>
    </UserContextProvider>
  )
}

export default App
