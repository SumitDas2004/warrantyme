import React, { useEffect, useRef, useState } from "react";

const FileInputModel = ({ token, setIsListOpen, loadDataToEditor }) => {
  const [files, setFiles] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listFiles = async () => {
    setIsLoading(true);
    const raw = await fetch(`${import.meta.env.VITE_SERVER}/list/files`, {
      headers: {
        Authorization: token,
      },
    });
    const res = await raw.json();
    setFiles(res.files);
    setIsLoading(false);
  };

  const convertToHtml = async (fileId) => {
    const raw = await fetch(`${import.meta.env.VITE_SERVER}/docx-to-html/`+fileId, {
        method: 'POST',
        headers: {
          Authorization: token,
        },
      });
      const res = await raw.json();
      loadDataToEditor(res.html)
  }

  const listContainer = useRef();

  useEffect(() => {
    listFiles();
    
  }, []);


  return (
    <div
    onClick={(e)=>{
        if(!listContainer.current.contains(e.target))
            setIsListOpen(false)
    }}
      style={{
        height: "100vh",
        width: "100vw",
        position: "fixed",
        top: "0px",
        left: "0px",
        zIndex: 50,
        backgroundColor: "rgba(1, 1, 1, 0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div ref={listContainer}
        style={{
          width: "100%",
          height: "100%",
          maxHeight: 500,
          maxWidth: 700,
          borderRadius: 15,
          backgroundColor: "white",
          padding: 40,
          overflowY: "auto",
        }}
      >
        <h1 style={{marginLeft: 40}}>Your Files</h1>
        {isLoading && (
          <div 
            style={{
              fontSize: "2.1rem",
              textAlign: "center",
              color: "gray",
            }}
          >
            Loading...
          </div>
        )}
        <ul style={{ listStyle: "none", paddingInlineStart: 0 }}>
          {files &&
            files.map((file) => (
              <li
                key={file.id}
                className="fileList"
                style={{
                  fontSize: "1.8rem",
                  textAlign: "center",
                  width: "100%",
                  display: "inline-block",
                  borderBottom: "1px solid gray",
                  transitionDuration: "150ms",
                  transitionProperty: "all",
                }}
                onClick={()=>convertToHtml(file.id)}
              >
                {file.name}
              </li>
            ))}
        </ul>
        {!files && !isLoading && 'No files found'}
      </div>
    </div>
  );
};

export default FileInputModel;
