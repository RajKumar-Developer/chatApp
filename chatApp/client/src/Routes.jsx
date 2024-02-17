import RegisterAndLoginForm from "./RegisterAndLoginForm";
import { useContext } from "react";
import { UserContext } from "./UserContext";
import Chat from "./Chat";
export default function Routes() {
  // eslint-disable-next-line no-unused-vars
  const { username, id } = useContext(UserContext);
  if (username) {
    return <Chat />;
  }
  return <RegisterAndLoginForm />;
}
