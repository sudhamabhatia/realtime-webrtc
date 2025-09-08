"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type EphemeralResp = { ephemeralKey: string };

export default function Page() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create the remote audio element lazily
    if (!remoteAudioRef.current) {
      const el = document.createElement("audio");
      el.autoplay = true;
      el.playsInline = true;
      remoteAudioRef.current = el;
      document.body.appendChild(el);
    }
    return () => {
      if (remoteAudioRef.current) {
        try {
          document.body.removeChild(remoteAudioRef.current);
        } catch {}
      }
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setConnecting(true);
      setError(null);

      const res = await fetch("/api/realtime/ephemeral", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data: any = await res.json();
      const ek: string | undefined = data?.ephemeralKey || data?.value;
      if (!ek || !ek.startsWith("ek_")) {
        throw new Error("Server did not return a valid ephemeral key");
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
      };

      // Mic
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));

      // Let the model send us audio back
      pc.addTransceiver("audio", { direction: "recvonly" });

      // Data channel for sending/receiving events
      const dc = pc.createDataChannel("oai-events");
      dc.addEventListener("open", () => console.log("datachannel open"));
      dc.addEventListener("message", (e) => {
        try {
          console.log("oai event:", JSON.parse(e.data));
        } catch {
          console.log("oai event (raw):", e.data);
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete to produce a full SDP
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const check = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", check);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", check);
      });

      const sdp = pc.localDescription?.sdp;
      if (!sdp) throw new Error("No localDescription SDP");

      const answerResp = await fetch(
        "https://api.openai.com/v1/realtime/calls?model=gpt-realtime-2025-08-28",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ek}`,
            "Content-Type": "application/sdp",
            Accept: "application/sdp",
          },
          body: sdp,
        }
      );

      if (!answerResp.ok) {
        const text = await answerResp.text();
        throw new Error(`Realtime SDP exchange failed: ${text}`);
      }

      const answerSDP = await answerResp.text();
      const answer = new RTCSessionDescription({ type: "answer", sdp: answerSDP });
      await pc.setRemoteDescription(answer);

      setConnected(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    try {
      pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      pcRef.current?.getReceivers().forEach((r) => r.track?.stop());
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setConnected(false);
  }, []);

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <div style={{ display: "grid", gap: 16, textAlign: "center" }}>
        <h1>Realtime WebRTC (Next.js)</h1>
        <p>Connect your mic and speaker to the assistant via WebRTC.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={connect} disabled={connecting || connected}>
            {connecting ? "Connecting..." : connected ? "Connected" : "Connect"}
          </button>
          <button onClick={disconnect} disabled={!connected}>Disconnect</button>
        </div>
        {error && (
          <p style={{ color: "crimson", maxWidth: 560 }}>Error: {error}</p>
        )}
        <p style={{ color: "#666", maxWidth: 560 }}>
          The server mints a short‑lived ephemeral key. Your server key
          lives only in <code>.env.local</code>.
        </p>
      </div>
    </main>
  );
}
