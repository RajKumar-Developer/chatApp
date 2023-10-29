import  { useState, useContext } from "react";
import axios from "axios";
import { UserContext } from './UserContext'; // Updated import

function RegisterAndLoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isloginOrRegister,setIsLoginOrRegister] = useState('register')
    const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

    async function handleSubmit(ev) {
        const url = isloginOrRegister === 'register'?'register':'login';
        ev.preventDefault();
        const { data } = await axios.post(url, { username, password });
        setLoggedInUsername(username);
        setId(data.id);
    }

    return (
        <div className="bg-blue-50 h-screen flex items-center">
            <form className="w-64 mx-auto" onSubmit={handleSubmit}>
                
              <input 
                  value={username} 
                  onChange={ev => setUsername(ev.target.value)} 
                  type="text" 
                  placeholder="username" 
                  className="block w-full rounded-sm p-2 mb-2 border"
              />
              <input 
                   value={password}
                  onChange={ev => setPassword(ev.target.value)}
                  type="password" 
                  placeholder="password" 
                  className="block w-full rounded-sm p-2 mb-2 border"
              />
              <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
                  {isloginOrRegister === 'register'?'Register':'Login'}
              </button>
              <div className="text-center mt-2">
                {isloginOrRegister === 'register' && (
                  <div>
                    Already a member? 
                    <button onClick={()=>setIsLoginOrRegister('login')}>
                      Login here
                    </button>
                  </div> 
                  )}
                  {isloginOrRegister === 'login' && (
                    <div>
                      Dont have a account?
                      <button onClick={()=> setIsLoginOrRegister('register')}>
                          Register
                      </button>
                    </div>
                  )}
              </div>
            </form>
        </div>
    )
}

export default RegisterAndLoginForm;



