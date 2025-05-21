import React from 'react';
import { Pie, Bar } from '@ant-design/charts';
import { motion } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Box, Typography } from '@mui/material';

const AnalyticsChart = ({ type, data, isLoading }) => {
	if (isLoading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" height="400px">
				<Skeleton width={400} height={300} />
			</Box>
		);
	}

	if (type === 'pie') {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1 }}
			>
				<Pie
					data={data}
					angleField="value"
					colorField="name"
					radius={0.8}
					label={{
						type: 'outer',
						content: '{name} {value}',
					}}
				/>
				<Typography variant="caption">Pie Chart</Typography>
			</motion.div>
		);
	}

	if (type === 'bar') {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1 }}
			>
				<Bar
					data={data}
					xField="name"
					yField="value"
					seriesField="name"
					legend={{ position: 'top-left' }}
				/>
				<Typography variant="caption">Bar Chart</Typography>
			</motion.div>
		);
	}

	return null;
};

export default AnalyticsChart;
