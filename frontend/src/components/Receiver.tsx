import { useEffect } from "react";

export const Receiver = () => {
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
      console.log("WebSocket connection established.");
      socket.send(
        JSON.stringify({
          type: "receiver",
        })
      );
    };

    startReceiving(socket);

    return () => {
      socket.close(); // Clean up the WebSocket connection when the component unmounts
    };
  }, []);

  function startReceiving(socket: WebSocket) {
    const video = document.createElement("video");
    video.autoplay = true; // Ensure the video plays automatically
    video.muted = true; // Mute video to allow autoplay without user interaction
    document.body.appendChild(video);

    const pc = new RTCPeerConnection();

    pc.ontrack = (event) => {
      console.log("Track received:", event.track);
      video.srcObject = new MediaStream([event.track]);
      video.play().catch((error) => {
        console.error("Error playing video:", error);
      });
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Message received:", message);

      if (message.type === "createOffer") {
        pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
          .then(() => pc.createAnswer())
          .then((answer) => {
            pc.setLocalDescription(answer);
            socket.send(
              JSON.stringify({
                type: "createAnswer",
                sdp: answer,
              })
            );
          })
          .catch((error) => {
            console.error("Error handling SDP:", error);
          });
      } else if (message.type === "iceCandidate") {
        pc.addIceCandidate(new RTCIceCandidate(message.candidate)).catch(
          (error) => {
            console.error("Error adding ICE candidate:", error);
          }
        );
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({
            type: "iceCandidate",
            candidate: event.candidate,
          })
        );
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
    };
  }

  return <div>Receiver</div>;
};
