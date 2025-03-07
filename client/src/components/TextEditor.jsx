import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import FileInputModel from "./FileInputModel";

function TextEditor() {
  const [params] = useSearchParams();
  const [isListOpen, setIsListOpen] = useState(false);
  const [userdetails, setUserdetails] = useState(null);
  const navigator = useNavigate()

  const editor = useRef();

  const loadDataToEditor = (data) => {
    editor.current.innerHTML = data;
    setIsListOpen(false);
  };

  const boldSelection = () => {
    document.execCommand("bold", false);
  };

  const italicSelection = () => {
    document.execCommand("italic", false);
  };

  const underlineSelection = () => {
    document.execCommand("underline", false);
  };

  const insertOrderList = () => {
    document.execCommand("insertOrderedList", false);
  };

  const insertUnorderedList = () => {
    document.execCommand("insertUnorderedList", false);
  };

  const justifyLeft = () => {
    document.execCommand("justifyLeft", false);
  };
  const justifyRight = () => {
    document.execCommand("justifyRight", false);
  };
  const justifyCenter = () => {
    document.execCommand("justifyCenter", false);
  };

  const justifyEvenly = () => {
    document.execCommand("justifyFull", false);
  };

  const exp = async () => {
    const name = prompt("Please enter file name.");
    const html = editor.current.innerHTML;
    editor.current.innerHTML = "";
    const raw = await fetch(`${import.meta.env.VITE_SERVER}/html-to-docx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: params.get("token"),
      },
      body: JSON.stringify({
        html, 
        name: name,
      }),
    });


    const res = await raw.json();
    alert(res.message)
    setIsExporting(false);
  };

  const imp = async () => {
    setIsListOpen(true);
  };

  const loadUser = async () => {
    const raw = await fetch(`${import.meta.env.VITE_SERVER}/userdetails`, {
      headers: {
        Authorization: params.get("token"),
      }
    })
    const res = await raw.json();
    if(raw.status<200 || raw.status>399){
      setUserdetails(null);
      navigator('/login')
    }else{
      setUserdetails(res);
    }
  }

  useEffect(()=>{loadUser()}, [])

  return (
    <>
      {isListOpen && (
        <FileInputModel
          loadDataToEditor={loadDataToEditor}
          setIsListOpen={setIsListOpen}
          token={params.get("token")}
        />
      )}
      {userdetails && <div style={{
        display: "flex",
        alignItems: 'center',
        justifyContent: 'end',
        fontSize: '2rem',
        gap: 20,
        paddingRight: 40
      }}>
          <span>{userdetails.name}</span>
        <img style={{borderRadius: '9999999px', height:'5rem'}} src={userdetails.photo}/>
      </div>}
      <div style={{ width: "fit-content", margin: "auto" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: 20, width: '100%', justifyContent: 'space-between' }}>
          <button className="buttonStyle" style={{fontWeight: 'bold', height: 50, width: 50}} onClick={boldSelection}>B</button>
          <button className="buttonStyle" style={{textDecoration: 'underline', height: 50, width: 50}} onClick={underlineSelection}>U</button>
          <button className="buttonStyle" style={{fontStyle: 'italic', height: 50, width: 50}} onClick={italicSelection}>i</button>
          <button className="buttonStyle" onClick={insertOrderList} style={{ height: 50, width: 50}}>OL</button>
          <button className="buttonStyle" onClick={insertUnorderedList}>UL</button>
          <button className="buttonStyle" onClick={imp} style={{ height: 50, width: 50}}><img src="https://img.icons8.com/?size=20&id=366&format=png&color=000000"/></button>
          <button className="buttonStyle" onClick={exp} style={{ height: 50, width: 50}}><img src="https://img.icons8.com/?size=20&id=368&format=png&color=000000"/></button>
        </div>
        <div
          ref={editor}
          style={{
            height: "1000px",
            width: "700px",
            margin: "auto",
            border: "1px solid",
            padding: 60,
            overflowY: "auto",
            fontSize: 20
          }}
          contentEditable={true}
        >
          Hello world
        </div>
      </div>
    </>
  );
}

export default TextEditor;
