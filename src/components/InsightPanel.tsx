import { Box, Chip, Paper, Stack, Typography } from '@mui/material';

type InsightPanelProps = {
  narrative: string;
  recommendations: string[];
};

const InsightPanel = ({ narrative, recommendations }: InsightPanelProps) => {
  return (
    <Paper elevation={0} className="narrative-shell">
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
          <Box className="narrative-heading">
            <Typography variant="overline" className="narrative-eyebrow">What the data says</Typography>
            <Typography variant="h5" className="narrative-title">A sharper read on the delay story</Typography>
          </Box>
        </Stack>
        <Typography variant="body1" className="narrative-copy">{narrative}</Typography>
        <Stack direction="column" className='recommendation-container' spacing={1}>
          {recommendations.map((item) => (
            <Chip key={item} label={item} variant="outlined" color="primary" />
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default InsightPanel;
