/* global __app_id */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase-config";
import "./EventSlideshow.css";

export default function EventSlideshow() {
  const [content, setContent] = useState({
    // Nền
    backgroundType: "shader",
    backgroundColor: "#000000",

    // Text
    titleLine1: "Đang tải...",
    titleLine2: "",
    locationAndDate: "Đang tải...",
    theme: "Đang tải...",
    attendees: "Đang tải...",

    // Thời gian
    eventTimestamp: null,

    // MÀU TÊN CÔNG TY
    companyNameColor: "#ff0000",

    // THÊM CÁC TRƯỜNG CỠ CHỮ VỚI GIÁ TRỊ MẶC ĐỊNH
    titleLine1Size: 80,
    titleLine2Size: 60,
    statusTextSize: 24,
    countdownSize: 48,
    locationAndDateSize: 20,
  });

  const [statusText, setStatusText] = useState("Sự kiện sẽ bắt đầu trong");
  const [countdown, setCountdown] = useState("--:--:--");
  const [isFading, setIsFading] = useState(false);
  const [eventStarted, setEventStarted] = useState(false);

  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const docRef = useMemo(() => {
    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    return doc(db, `artifacts/${appId}/public/data/slideshow`, "mainContent");
  }, []);

  // Lấy dữ liệu từ Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setContent((prev) => ({
          ...prev,
          ...data,
          backgroundType: data.backgroundType || "shader",
          backgroundColor: data.backgroundColor || "#000000",
          companyNameColor: data.companyNameColor || "#ff0000",
          // Đảm bảo có giá trị mặc định nếu dữ liệu trên server bị thiếu
          titleLine1Size: data.titleLine1Size || 80,
          titleLine2Size: data.titleLine2Size || 60,
          statusTextSize: data.statusTextSize || 24,
          countdownSize: data.countdownSize || 48,
          locationAndDateSize: data.locationAndDateSize || 20,
        }));
      } else {
        setContent({
          backgroundType: "shader",
          backgroundColor: "#000000",
          titleLine1: "Chưa có sự kiện",
          titleLine2: "Vui lòng cấu hình",
          locationAndDate: "",
          theme: "",
          attendees: "",
          eventTimestamp: null,
          companyNameColor: "#ff0000",
          titleLine1Size: 80,
          titleLine2Size: 60,
          statusTextSize: 24,
          countdownSize: 48,
          locationAndDateSize: 20,
        });
      }
    });
    return () => unsubscribe();
  }, [docRef]);

  // Nền shader WebGL (Không thay đổi)
  useEffect(() => {
    if (content.backgroundType !== "shader") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;
    const fragmentShaderSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      float random (vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
      float noise (vec2 st) {
        vec2 i = floor(st); vec2 f = fract(st);
        float a=random(i), b=random(i+vec2(1.,0.)), c=random(i+vec2(0.,1.)), d=random(i+vec2(1.,1.));
        vec2 u=f*f*(3.-2.*f);
        return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
      }
      float fbm(vec2 st){ float v=0., a=0.5; for(int i=0;i<5;i++){ v+=a*noise(st); st*=2.; a*=0.5; } return v; }
      void main(){
        vec2 st=gl_FragCoord.xy/u_resolution.xy; st.x*=u_resolution.x/u_resolution.y;
        vec2 q; q.x=fbm(st+0.1*u_time); q.y=fbm(st+vec2(1.));
        vec2 r; r.x=fbm(st+1.0*q+vec2(1.7,9.2)+0.15*u_time); r.y=fbm(st+1.0*q+vec2(8.3,2.8)+0.126*u_time);
        float f=fbm(st+r);
        vec3 color=mix(vec3(0.0,0.1,0.15),vec3(0.0,0.5,0.4),clamp((f*f)*2.,0.,1.));
        color=mix(color,vec3(0.5,0.8,0.7),clamp(length(q),0.,1.));
        gl_FragColor=vec4(color,1.0);
      }
    `;
    function createShader(gl, type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    }
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");

    let rafId;
    const render = (time) => {
      time *= 0.001;
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(uRes, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [content.backgroundType]);

  // Đếm ngược (Không thay đổi)
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!content.eventTimestamp) {
      setEventStarted(false);
      setStatusText("Sự kiện sẽ bắt đầu trong");
      setCountdown("Chưa đặt giờ");
      return;
    }

    const eventDate = content.eventTimestamp.toDate().getTime();

    const updateClock = () => {
      const now = Date.now();
      const distance = eventDate - now;

      if (distance <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsFading(true);
        setTimeout(() => {
          setStatusText("Sự kiện đang diễn ra");
          setEventStarted(true);
          setIsFading(false);
        }, 300);
        return;
      }
      
      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      let countdownString = "";
      if (d > 0) {
        countdownString += `${d} ngày `;
      }
      countdownString += `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      
      setCountdown(countdownString);
    };

    updateClock();
    intervalRef.current = setInterval(updateClock, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [content.eventTimestamp]);

  return (
    <div
      className="slideshow-body"
      style={{
        backgroundColor:
          content.backgroundType === "color" ? content.backgroundColor : "transparent",
      }}
    >
      {content.backgroundType === "shader" && (
        <canvas id="interactive-canvas" ref={canvasRef}></canvas>
      )}

      <div className="content-container">
        <div className="company-info">
          <img
            src="https://bachkhoaangiang.com/images/logo-bach-khoa-an-giang.png"
            alt="Logo Bách Khoa An Giang"
            className="logo"
          />
          <p className="subtitle" style={{ color: content.companyNameColor || "#ff0000" }}>
            CÔNG TY CPXD BÁCH KHOA
          </p>
        </div>

        {/* --- ÁP DỤNG CỠ CHỮ TỪ FIRESTORE --- */}
        <div className="title-container">
          <h1 className="blended-text typing-effect" style={{ fontSize: `${content.titleLine1Size}px` }}>
            {content.titleLine1}
          </h1>
          <h1 className="blended-text2" style={{ fontSize: `${content.titleLine2Size}px` }}>
            {content.titleLine2}
          </h1>
        </div>

        <div className="divider"></div>
        <p className={`status-text blended-text ${isFading ? "fading-out" : ""}`} style={{ fontSize: `${content.statusTextSize}px` }}>
          {statusText}
        </p>

        {!eventStarted && (
          <div id="countdown" className={`blended-text ${isFading ? "fading-out" : ""}`} style={{ fontSize: `${content.countdownSize}px` }}>
            {countdown}
          </div>
        )}

        <p className="date blended-text" style={{ fontSize: `${content.locationAndDateSize}px` }}>
          {content.locationAndDate}
        </p>
      </div>
    </div>
  );
}