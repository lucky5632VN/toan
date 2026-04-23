import { useEffect } from 'react';
import api from '../api/axios';
import { useGeometryStore } from '../store/useGeometryStore';

export const useGeometryAPI = () => {
  const { 
    selectedShape, 
    shapeParams, 
    setShapeData, 
    setLoading, 
    setError,
    plane,
    setCrossSection,
    setComputingSection
  } = useGeometryStore();

  // Fetch shape data whenever selectedShape or shapeParams change
  useEffect(() => {
    const fetchShape = async () => {
      if (selectedShape === 'custom') return;
      setLoading(true);
      setError(null);
      console.log('Fetching shape:', selectedShape, shapeParams);
      try {
        const response = await api.post('/api/geometry/generate', {
          shape_type: selectedShape,
          params: shapeParams
        });
        console.log('Shape data received:', response.data);
        setShapeData(response.data);
      } catch (err: any) {
        console.error('Error fetching shape:', err);
        setError(err.response?.data?.detail || 'Lỗi khi tạo hình khối');
      } finally {
        setLoading(false);
      }
    };

    fetchShape();
  }, [selectedShape, shapeParams, setShapeData, setLoading, setError]);

  // Function to compute cross section
  const computeSection = async () => {
    const { shapeData } = useGeometryStore.getState();
    if (!shapeData) return;

    setComputingSection(true);
    try {
      const response = await api.post('/api/cross-section/compute', {
        vertices: shapeData.vertices,
        edges: shapeData.edges,
        plane: plane
      });
      setCrossSection(response.data);
    } catch (err: any) {
      console.error('Error computing cross section:', err);
    } finally {
      setComputingSection(false);
    }
  };

  return { computeSection };
};
