import { useState,useEffect, useContext,useRef } from "react";
import Avatar from "./Avatar";
import axios from 'axios'
import Logo from './Logo'
import { UserContext } from "./UserContext";
import uniqBy from 'lodash/uniqBy';
export default function Chat(){
    const [ws,setWs] = useState(null);
    const [onlinePeople,setOnlinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const {username,id} = useContext(UserContext);
    const messagesBoxRef = useRef()
    const divUnderMessages = useRef();
    const [messages,setMessages] = useState([]);
    const [newMessageText, setNewMessageText] = useState('');
    useEffect(()=>{
        const ws = new WebSocket('ws://localhost:4000');
        setWs(ws);
        ws.addEventListener('message',handleMessage)
        ws.
    },[]);
    
    function showOnlinePeople(peopleArray){
        const people ={};
        peopleArray.forEach(({userId,username})=>{
            people[userId] = username;
        });
        setOnlinePeople(people);
    }
    function handleMessage(ev){
        const messageData = JSON.parse(ev.data);
        console.log({ev,messageData});
        if('online' in messageData){
            showOnlinePeople(messageData.online);
        }else if ('text' in messageData){
            setMessages(prev => ([...prev,{...messageData}]))
        }
        // console.log(messageData);
        // ev.data.text().then(messageString=>{
        //     console.log(messageString);
        // });
    }
    function sendMessage(ev){
        ev.preventDefault();
        console.log('sending');
        ws.send(JSON.stringify({
            recipient:selectedUserId,
            text:newMessageText,
        }));
        setNewMessageText('');
        setMessages(prev => ([...prev,{
            text:newMessageText,
            sender:id,
            recipient:selectedUserId,
            id:Date.now(),
        }]));
    }

    useEffect(()=>{
        const div = divUnderMessages.current;
        // div.scrollTop = div.scrollHeight; 
        if (div){
            div.scrollIntoView({behavior:'smooth',block:'end'})
        }
        
    },[messages]);


    useEffect((()=>{
        if(selectedUserId){
            axios.get('/messages/'+selectedUserId)
        }
    }));

    const onlinePeopleExclOurUser = {...onlinePeople}
    delete onlinePeopleExclOurUser[id]

    const messagesWithoutDupes = uniqBy(messages,'id') ;

    return(
        <div className="flex h-screen">
            <div className="bg-white w-1/3 ">
                <Logo/>
                {Object.keys(onlinePeopleExclOurUser).map(userId=>(
                    <div onClick={()=> setSelectedUserId(userId)}
                         className={"border-b border-gray-100   flex item-center gap-2 cursor-pointer "+(userId === selectedUserId ? 'bg-blue-50': '')} 
                         key={userId}>
                         {userId === selectedUserId && (
                            <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
                         )}
                         <div className="flex gap-2 py-2 pl-4 items-center">
                            <Avatar username={onlinePeople[userId]} userId={userId}/>
                            <span className="text-gray-800">{onlinePeople[userId]}</span>
                         </div>
                        
                    </div>
                ))}
            </div>
            <div className="flex flex-col bg-blue-50 w-2/3 p-2">
                <div className="flex-grow">
                   {!selectedUserId && (
                        <div className="flex h-full flex-grow items-center justify-center">
                            <div className="text-gray-300">&larr; Select a person from the sidebar</div>
                        </div>
                    )}
                    
                    {!!selectedUserId && (
                    <div className="mb-4 h-full ">
                        <div className="relative h-full">
                            <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                            {messagesWithoutDupes.map(message => (
                                <div className={(message.sender === id ? 'text-right': 'text-left')}>
                                    <div className={"inline-block p-2 my-2 rounded-md text-sm "+(message.sender === id ? 'bg-blue-500 text-white':'bg-white text-gray-500')}>
                                        sender:{message.sender}<br/>
                                        my id: {id}<br/>
                                        {message.text}
                                        </div>
                                    </div>
                                ))};
                                <div ref={divUnderMessages}></div>
                            </div>
                        </div>
                    </div>
                    )}
                </div> 
                {!!selectedUserId && (
                    <form className="flex gap-2" onSubmit={sendMessage}>
                        <input 
                            type="text" 
                            value={newMessageText}
                            onChange={ev => setNewMessageText(ev.target.value)}
                            placeholder="Type Your message here"
                            className="bg=white flex-grow border rounded-sm p-2"
                        />
                        <button type="submit" className="bg-blue-500 p-2 text-white rounded-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                        </button>
                    </form>
                )}
                
            </div>
        </div>
    )
}