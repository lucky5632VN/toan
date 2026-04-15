import { Line, Text } from '@react-three/drei';

const OxyzAxes: React.FC = () => {
  const length = 10;
  
  return (
    <group>
      {/* Ox - Red */}
      <Line
        points={[[0, 0, 0], [length, 0, 0]]}
        color="#ff4444"
        lineWidth={2}
      />
      <Text
        position={[length + 0.5, 0, 0]}
        fontSize={0.5}
        color="#ff4444"
      >
        x
      </Text>

      {/* Oy - Green */}
      <Line
        points={[[0, 0, 0], [0, length, 0]]}
        color="#44ff44"
        lineWidth={2}
      />
      <Text
        position={[0, length + 0.5, 0]}
        fontSize={0.5}
        color="#44ff44"
      >
        y
      </Text>

      {/* Oz - Blue */}
      <Line
        points={[[0, 0, 0], [0, 0, length]]}
        color="#4444ff"
        lineWidth={2}
      />
      <Text
        position={[0, 0, length + 0.5]}
        fontSize={0.5}
        color="#4444ff"
      >
        z
      </Text>

      {/* Origin */}
      <Text
        position={[-0.5, -0.5, -0.5]}
        fontSize={0.4}
        color="#888888"
      >
        O
      </Text>

      {/* Grid helper on Oxy plane */}
      <gridHelper 
        args={[20, 20]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
      />
    </group>
  );
};

export default OxyzAxes;
