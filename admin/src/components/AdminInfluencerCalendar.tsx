import React, { useEffect, useState } from "react";
import {
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { adminService } from "../services/adminService";
import tourService from "../services/tourService";
import type { ITour } from "../../../shared/types/tour";

const AdminInfluencerCalendar: React.FC = () => {
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState<string>("");
  const [tours, setTours] = useState<ITour[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedTour, setSelectedTour] = useState<ITour | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchInfluencers();
  }, []);

  useEffect(() => {
    if (selectedInfluencer) {
      fetchTours(selectedInfluencer);
    } else {
      setTours([]);
    }
  }, [selectedInfluencer]);

  const fetchInfluencers = async () => {
    try {
      const res = await adminService.getUsers({ role: "influencer", limit: 200 });
      if (res.status && res.data) {
        setInfluencers(res.data);
      }
    } catch (err) {
      console.error("Failed to load influencers", err);
    }
  };

  const fetchTours = async (influencerId: string) => {
    try {
      setLoading(true);
      const resp = await tourService.getInfluencerTours(influencerId);
      if (resp && resp.status && resp.data) {
        // Ensure dates are parsed as Date objects
        const parsed = (resp.data || []).map((t) => ({
          ...t,
          startDate: new Date(t.startDate as any),
          endDate: new Date(t.endDate as any),
        })) as ITour[];
        setTours(parsed);
      } else {
        setTours([]);
      }
    } catch (err) {
      console.error("Failed to fetch tours", err);
      setTours([]);
    } finally {
      setLoading(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthEnd = new Date(year, month + 1, 0);
  const daysInMonth = Array.from({ length: monthEnd.getDate() }, (_v, i) => new Date(year, month, i + 1));
  const allDays = daysInMonth;

  const handlePrev = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNext = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const toursForDate = (date: Date) => {
    return tours.filter((t) => {
      if (!t.startDate) return false;
      const s = new Date(t.startDate);
      const e = new Date(t.endDate);
      return date >= s && date <= e;
    });
  };

  return (
    <Box>
      <Box display="flex" gap={2} alignItems="center" mb={3}>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>Select Influencer</InputLabel>
          <Select
            value={selectedInfluencer}
            label="Select Influencer"
            onChange={(e) => setSelectedInfluencer(e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {influencers.map((inf) => (
              <MenuItem key={inf._id} value={inf._id}>
                {inf.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handlePrev} startIcon={<ChevronLeftIcon />}>
            Prev
          </Button>
          <Typography variant="h6" alignSelf="center" sx={{ minWidth: 180, textAlign: "center" }}>
            {currentDate.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </Typography>
          <Button variant="outlined" size="small" onClick={handleNext} endIcon={<ChevronRightIcon />}>
            Next
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Box display="grid" gridTemplateColumns="repeat(7,1fr)" gap={1} mb={2}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Box key={d} textAlign="center" fontWeight={600} color="text.secondary">
                {d}
              </Box>
            ))}
            {allDays.map((day: Date) => {
              const dayTours = toursForDate(day);
              const isCurr = day.getMonth() === currentDate.getMonth() && day.getFullYear() === currentDate.getFullYear();
              const today = day.toDateString() === new Date().toDateString();
              return (
                <Box
                  key={day.toISOString()}
                  onClick={() => {
                    if (dayTours.length === 1) {
                      setSelectedTour(dayTours[0]);
                      setDialogOpen(true);
                    }
                  }}
                  sx={{
                    minHeight: 120,
                    p: 1,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: isCurr ? "grey.200" : "grey.100",
                    backgroundColor: isCurr ? "background.paper" : "grey.50",
                    cursor: "pointer",
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color={today ? "primary" : "text.primary"}>
                      {day.getDate()}
                    </Typography>
                    {dayTours.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {dayTours.length} event{dayTours.length > 1 ? "s" : ""}
                      </Typography>
                    )}
                  </Box>
                  <Box mt={1} display="flex" flexDirection="column" gap={0.5}>
                    {dayTours.slice(0, 2).map((t) => (
                      <Box
                        key={t._id}
                        sx={{
                          bgcolor: "#E8F0FE",
                          px: 1,
                          py: 0.5,
                          borderRadius: 0.5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTour(t);
                          setDialogOpen(true);
                        }}
                      >
                        <Typography variant="caption">{t.title}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tour Details</DialogTitle>
        <DialogContent>
          {selectedTour ? (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedTour.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {new Date(selectedTour.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} -{" "}
                {new Date(selectedTour.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Location:</strong> {selectedTour.location?.address || "N/A"}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Purpose:</strong> {selectedTour.description || "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Created: {new Date(selectedTour.createdAt).toLocaleString()}
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminInfluencerCalendar;

