import { Card, Typography } from 'antd';

export function TrainPage() {
  return (
    <Card className="shadow-soft">
      <Typography.Title level={2}>Training</Typography.Title>
      <Typography.Paragraph>
        This screen will host model selection, training controls, and live progress.
      </Typography.Paragraph>
    </Card>
  );
}
