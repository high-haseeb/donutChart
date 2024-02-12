import React from "react";
import { Text, OrthographicCamera, PresentationControls, Billboard, Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CSG } from "three-csg-ts";

function springAnimation(end, setFunction = (e) => console.log("please give a set function"), stiffness = 0.2, damping = 0.5) {
  let position = 0;
  let velocity = 0;

  function animate() {
    const force = -stiffness * (position - end);
    const dampingForce = -damping * velocity;
    const acceleration = force + dampingForce;

    velocity += acceleration;
    position += velocity;

    setFunction(position);

    if (Math.abs(position - end) > 0.001) {
      requestAnimationFrame(animate);
    }
  }

  animate();
}
const DonutChart = ({ graph, ...props }) => {
  let totalCovered = 0;
  const [isClient, setIsClient] = useState(false);

  // Detect whether we're on the client-side and set the state accordingly
  useEffect(() => {
    setIsClient(true);
  }, []);
  return (
    <Canvas style={{ width: "100%", height: "100%" }} {...props}>
      <PresentationControls rotation={[Math.PI / 3, -Math.PI / 2, 0]}>
        {graph.sections.map((value, i) => {
          const startAngle = (totalCovered * Math.PI * 2) / 100;
          const length = (value.percentage * Math.PI * 2) / 100;
          totalCovered += value.percentage;
          return (
            <group>
              <Section
                key={i}
                thetaStart={startAngle}
                thetaLength={length}
                color={value.color}
                animationType={value.animation}
                delay={value.immediate ? 0 : i * graph.config.delay}
              />
              <Html position={[Math.sin(startAngle + length / 2) * 1, 0, Math.cos(startAngle + length / 2) * 2]} zIndexRange={[100, 0]} >
                <div style={{ borderColor: value.color }} className="chart_card_container">
                  <div className="chart_card_title">{value.title}</div>
                  <div className="chart_card_subtitle">{value.subtitle}</div>
                </div>
              </Html>
            </group>
          );
        })}
      </PresentationControls>
      <ambientLight intensity={3} />
      <directionalLight position={[1, 1, 0]} intensity={1} />
      <spotLight position={[0, 3, 0]} />
      <OrthographicCamera
        makeDefault
        position={[0, 0, 10]}
        zoom={100}
        left={-window.innerWidth / 2}
        right={window.innerWidth / 2}
        top={window.innerHeight / 2}
        bottom={-window.innerHeight / 2}
        near={0.1}
        far={1000}
      />
    </Canvas>
  );
};

const Section = ({ thetaStart, thetaLength, color, animationType, height = 1, stiffness = 0.1, damping = 0.8, delay = 0 }) => {
  const meshRef = useRef();
  useEffect(() => {
    if (!meshRef.current) return;
    let outer, inner, animationTarget;
    let initialValue = 0;
    if (animationType === "rotate") {
      animationTarget = thetaLength;
      outer = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, height, 16, 16, false, thetaStart, initialValue));
      inner = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, height, 16, 16, false, thetaStart, initialValue));
    } else if (animationType === "grow") {
      animationTarget = height;
      outer = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, initialValue, 16, 16, false, thetaStart, thetaLength));
      inner = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, initialValue, 16, 16, false, thetaStart, thetaLength));
    }
    const updateDonut = (animatedValue) => {
      outer.geometry.dispose();
      inner.geometry.dispose();
      if (animationType === "grow") {
        outer.geometry = new THREE.CylinderGeometry(2, 2, animatedValue, 16, 16, false, thetaStart, thetaLength);
        inner.geometry = new THREE.CylinderGeometry(1, 1, animatedValue, 16, 16, false, thetaStart, thetaLength);
      } else if (animationType === "rotate") {
        outer.geometry = new THREE.CylinderGeometry(2, 2, height, 16, 16, false, thetaStart, animatedValue);
        inner.geometry = new THREE.CylinderGeometry(1, 1, height, 16, 16, false, thetaStart, animatedValue);
      }
      outer.geometry.needsUpdate = true;
      inner.geometry.needsUpdate = true;

      // Perform CSG subtraction
      outer.updateMatrix();
      inner.updateMatrix();
      const subRes = CSG.subtract(outer, inner);
      if (meshRef.current.geometry) {
        meshRef.current.geometry.dispose();
      }
      meshRef.current.geometry = subRes.geometry;
    };

    const timeout = setTimeout(() => {
      springAnimation(animationTarget, updateDonut, stiffness, damping);
    }, delay);

    return () => clearTimeout(timeout);
  }, [meshRef.current]);
  return (
    <mesh ref={meshRef} onUpdate={() => (meshRef.current = this)}>
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

export default DonutChart;
