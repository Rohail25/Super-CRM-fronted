import { useParams } from 'react-router-dom';
import ProjectIframe from '../components/projects/ProjectIframe';

export default function ProjectIframePage() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return <div>Invalid project ID</div>;
  }

  return <ProjectIframe projectId={parseInt(projectId)} />;
}
