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

    // MÀU TÊN CÔNG TY (MỚI)
    companyNameColor: "#ffffff",
  });

  const [statusText, setStatusText] = useState("Sự kiện sẽ bắt đầu trong");
  const [countdown, setCountdown] = useState("--:--:--");
  const [isFading, setIsFading] = useState(false);
  const canvasRef = useRef(null);

  const docRef = useMemo(() => {
    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    return doc(db, `artifacts/${appId}/public/data/slideshow`, "mainContent");
  }, []);

  // Lấy dữ liệu & (nếu cần) khởi tạo WebGL
  useEffect(() => {
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setContent((prev) => ({
          ...prev,
          ...data,
          backgroundType: data.backgroundType || "shader",
          backgroundColor: data.backgroundColor || "#000000",
          // đảm bảo luôn có màu tên công ty
          companyNameColor: data.companyNameColor || "#ffffff",
        }));
      } else {
        console.log("Không tìm thấy dữ liệu slideshow!");
        setContent({
          backgroundType: "shader",
          backgroundColor: "#000000",
          titleLine1: "Chưa có sự kiện",
          titleLine2: "Vui lòng cấu hình",
          locationAndDate: "",
          theme: "",
          attendees: "",
          eventTimestamp: null,
          companyNameColor: "#ffffff",
        });
      }
    });

    // Chỉ khởi tạo WebGL nếu nền là 'shader'
    let animationFrameId;
    if (content.backgroundType === "shader") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const gl = canvas.getContext("webgl");
      if (!gl) {
        console.error("WebGL không được hỗ trợ!");
        return () => unsubscribe();
      }

      const vertexShaderSource = `
        attribute vec2 a_position;
        void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
      `;
      const fragmentShaderSource = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;

        float random (vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        float noise (vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        float fbm(vec2 st) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 5; i++) {
            value += amplitude * noise(st);
            st *= 2.;
            amplitude *= 0.5;
          }
          return value;
        }
        void main() {
          vec2 st = gl_FragCoord.xy / u_resolution.xy;
          st.x *= u_resolution.x / u_resolution.y;
          vec3 color = vec3(0.0);
          vec2 q = vec2(0.);
          q.x = fbm(st + 0.1 * u_time);
          q.y = fbm(st + vec2(1.0));
          vec2 r = vec2(0.);
          r.x = fbm(st + 1.0*q + vec2(1.7,9.2)+ 0.15*u_time );
          r.y = fbm(st + 1.0*q + vec2(8.3,2.8)+ 0.126*u_time);
          float f = fbm(st+r);
          color = mix(vec3(0.0, 0.1, 0.15), vec3(0.0, 0.5, 0.4), clamp((f*f)*2.0, 0.0, 1.0));
          color = mix(color, vec3(0.5, 0.8, 0.7), clamp(length(q), 0.0, 1.0));
          gl_FragColor = vec4(color, 1.0);
        }
      `;

      function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl. COMPILE_STATUS)) {
          console.error("Lỗi biên dịch shader:", gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      }

      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Lỗi link program:", gl.getProgramInfoLog(program));
      }
      gl.useProgram(program);

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

      const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
      const timeUniformLocation = gl.getUniformLocation(program, "u_time");

      function render(time) {
        time *= 0.001;
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(timeUniformLocation, time);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        animationFrameId = requestAnimationFrame(render);
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduceMotion) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        setTimeout(() => render(0), 100);
      }
    }

    return () => {
      unsubscribe();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [docRef, content.backgroundType]);

  // Đếm ngược
  useEffect(() => {
    if (!content.eventTimestamp) {
      setCountdown("Chưa đặt giờ");
      return;
    }
    const eventDate = content.eventTimestamp.toDate().getTime();

    const setFinalState = () => {
      setStatusText("Sự kiện đang diễn ra");
      setCountdown("Bắt đầu!");
    };

    const updateClock = () => {
      const now = new Date().getTime();
      const distance = eventDate - now;

      if (distance < 0) {
        clearInterval(countdownInterval);
        setIsFading(true);
        setTimeout(() => {
          setFinalState();
          setIsFading(false);
        }, 500);
        return;
      }
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setCountdown(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    let countdownInterval;
    if (new Date().getTime() > eventDate) {
      setFinalState();
    } else {
      updateClock();
      countdownInterval = setInterval(updateClock, 1000);
    }

    return () => clearInterval(countdownInterval);
  }, [content.eventTimestamp]);

  return (
    <div
      className="slideshow-body"
      style={{
        backgroundColor:
          content.backgroundType === "color" ? content.backgroundColor : "transparent",
      }}
    >
      {/* Nền shader */}
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
          {/* ÁP DỤNG MÀU TỪ companyNameColor */}
          <p
            className="subtitle"
            style={{ color: content.companyNameColor || "#ffffff" }}
          >
            CÔNG TY CPXD BÁCH KHOA
          </p>
        </div>

        <div className="title-container">
            <h1 className="blended-text typing-effect">{content.titleLine1}</h1>
        <h1 className="blended-text2 typing-effect">{content.titleLine2}</h1>
        </div>

        <div className="divider"></div>
        <p className={`status-text blended-text ${isFading ? "fading-out" : ""}`}>
          {statusText}
        </p>
        <div id="countdown" className={`blended-text ${isFading ? "fading-out" : ""}`}>
          {countdown}
        </div>
        <p className="date blended-text">{content.locationAndDate}</p>
      </div>
    </div>
  );
}
