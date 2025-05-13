import React, { useRef, useEffect } from 'react';
import * as handpose from '@tensorflow-models/handpose';
import '@tensorflow/tfjs';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const latestEarPositions = useRef({ left: null, right: null });
  const lastAlertTime = useRef(0);
  
  useEffect(() => {
    // 웹캠 연결
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });

    sendSlackAlert();

    // 크롬 알림 권한 요청
    Notification.requestPermission();

    // 손 모델 로딩
    const runHandpose = async () => {
      const net = await handpose.load();
      console.log('🤖 Handpose 모델 로딩 완료');

      setInterval(() => {
        detectHands(net);
      }, 100);
    };

    


const showNotification = () => {
  const now = Date.now();
  if (now - lastAlertTime < 10000) return; // 10초 이내엔 다시 안 띄움
  lastAlertTime.current = now;

  if (Notification.permission === 'granted') {
    new Notification('머리에서 손 내려!!!!!!!');
  }

  sendSlackAlert();  
};

    // 얼굴 모델 로딩
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (
        results.multiFaceLandmarks &&
        results.multiFaceLandmarks.length > 0
      ) {
        const landmarks = results.multiFaceLandmarks[0];
        const leftEar = landmarks[234];
        const rightEar = landmarks[454];
        latestEarPositions.current = {
          left: { x: leftEar.x * 640, y: leftEar.y * 480 },
          right: { x: rightEar.x * 640, y: rightEar.y * 480 },
        };

        // 시각화
        const ctx = canvasRef.current.getContext('2d');
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(leftEar.x * 640, leftEar.y * 480, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEar.x * 640, rightEar.y * 480, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // MediaPipe 전용 카메라 연결
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await faceMesh.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });
    camera.start();

    runHandpose();
  }, []);

  const detectHands = async (net) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || video.readyState !== 4) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const hands = await net.estimateHands(video);
    if (hands.length > 0) {
      const hand = hands[0];

      // 손 시각화
      hand.landmarks.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
      });

      const [x, y] = hand.landmarks[8]; // 검지 손끝

      const ears = latestEarPositions.current;
      if (ears.left && ears.right) {
        const isAboveOrEqualLeftEar = y <= ears.left.y;
        const isAboveOrEqualRightEar = y <= ears.right.y;
      
        if (isAboveOrEqualLeftEar || isAboveOrEqualRightEar) {
          console.log('👂 손이 귀 이상으로 올라왔어요!');
          showNotification();
        }
      }
    }
  };

  const getDistance = (x1, y1, x2, y2) => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };


  const sendSlackAlert = async () => {
    await fetch("https://hooks.slack.com/services/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", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "👂 손이 귀 이상으로 올라왔어요! (슬랙 알림)",
      }),
    });
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>👂 손 귀 닿음 감지기</h1>
      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '640px',
            height: '480px',
            borderRadius: '12px',
            backgroundColor: 'black',
          }}
        />
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      </div>
    </div>
  );
}

export default App;