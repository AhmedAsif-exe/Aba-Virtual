import React, { useEffect } from "react";
import api from "axiosInstance";
import {
  Typography,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
import gsap from "gsap";
import { Instagram, LinkedIn, Email, LocationOn, Phone } from "@mui/icons-material";
import { useState } from "react";
import { toast } from "react-toastify";
export const ContactInfoSection = () => {
  // The pricing page's Clinic and Custom cards link here as /contact?plan=Clinic.
  const plan = new URLSearchParams(window.location.search).get("plan");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    enquiryType: "",
    message: plan ? `I'm interested in the ${plan} supervision portal plan.` : "",
  });
  const contactInfo = {
    phone: "aba.virtual",
    email: "contact@abavirtual.net",
    address: "http://www.linkedin.com/in/faiza-faizan-b-s-qasp-s-509b03206",
    area: "Media Town",
    city: "Islamabad",
    zipCode: "44000",
    // Pakistani mobile 0318 0580948, in international format.
    contactPhone: "+92 318 0580948",
  };

  const subjectOptions = [
    { id: "general1", label: "Inquire about resources" },
    { id: "general2", label: "Consult the professional" },
    { id: "general3", label: "Write a blog for us" },
    {
      id: "general4",
      label: "ABAT requires remote supervision",
    },
    {
      id: "general5",
      label: "Require ABAT competency assessment",
    },
  ];

  useEffect(() => {
    const t1 = gsap.timeline({
      scrollTrigger: {
        trigger: "#contact",
        start: "top 90%",
        once: true,
      },
    });
    t1.fromTo(
      "#subtitle",
      {
        text: {
          value: "",
          delimiter: "",
        },
      },
      {
        text: {
          value: "Any question or remarks? Just write us a message!",
          delimiter: "",
        },
        duration: 1.5,
        ease: "none",
      },
    );
    t1.fromTo(
      "#contact",
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1.5 },
      "<",
    );
  }, []);
  console.log(formData);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = async () => {
    try {
      const res = await api.post("mail/send", formData);
      if (res.data.success) {
        toast.success("Message sent successfully!");
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          enquiry: "general1",
          message: "",
        });
      } else {
        toast.error("Failed to send message.");
      }
    } catch (err) {
      console.log(err);
      toast.error("Error sending message.");
    }
  };
  return (
    <div className="ml:px-14 ">
      <div className="flex flex-col items-center justify-center text-center mb-8 mt-10">
        <h1 className="font-bold text-[40px] font-['Poppins',Helvetica] text-[#F97544]">
          Contact Us
        </h1>
        <p className="font-medium text-lg text-[#4BB7BA]" id="subtitle">
          Any question or remarks? Just write us a message!
        </p>
      </div>
      <div
        className="flex flex-col t:flex-row rounded-lg shadow-lg max-w-[1440px] mx-auto mb-6"
        id="contact"
      >
        <div
          className="relative w-full flex flex-col justify-between p-8 t:w-[491px] h-[647px] bg-cover bg-center t:rounded-tl-[10px] t:rounded-bl-[10px] overflow-hidden"
          style={{
            backgroundColor: "#4BB7BA",
          }}
        >
          <div className="absolute w-[297px] h-[295px] bottom-[-100px] right-[-80px]">
            <div className="absolute w-[269px] h-[269px] top-[26px] left-7 bg-[#F97544] rounded-full" />
            <div className="absolute w-[138px] h-[138px] top-0 left-0 bg-[#F9754480] rounded-full" />
          </div>
          <div>
            <h3 className="text-start text-white font-semibold text-[28px]">
              Contact Information
            </h3>
            <p className="text-start text-[#265C7E] text-[18px] font-semibold ">
              Get in touch with us here
            </p>
          </div>
          <List>
            <ListItem>
              <ListItemAvatar>
                <Instagram sx={{ color: "white" }} />
              </ListItemAvatar>{" "}
              <ListItemText className="text-white">
                <a href="https://www.instagram.com/aba.virtual?igsh=YWczcGhsaW5tcDlm">
                  {contactInfo.phone}
                </a>
              </ListItemText>
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Email sx={{ color: "white" }} />
              </ListItemAvatar>
              <ListItemText className="text-white">
                {contactInfo.email}
              </ListItemText>
            </ListItem>
            <ListItem>
              <ListItemAvatar sx={{ alignSelf: "start" }}>
                <LinkedIn sx={{ color: "white" }} />
              </ListItemAvatar>
              <ListItemText className="text-white">
                <a href="http://www.linkedin.com/in/faiza-faizan-b-s-qasp-s-509b03206">
                  Faiza Faizan (B.S, QASP-S)
                </a>
              </ListItemText>
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <LocationOn sx={{ color: "white" }} />
              </ListItemAvatar>
              <ListItemText className="text-white">
                {contactInfo.area}, {contactInfo.city}, {contactInfo.zipCode}
              </ListItemText>
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Phone sx={{ color: "white" }} />
              </ListItemAvatar>
              <ListItemText className="text-white">
                <a href={`tel:${contactInfo.contactPhone.replace(/\s/g, "")}`}>
                  {contactInfo.contactPhone}
                </a>
              </ListItemText>
            </ListItem>
          </List>
          <div className="flex gap-2">
            <div className="w-[30px] h-[30px] bg-white rounded-full flex items-center justify-center">
              <LinkedIn sx={{ color: "black" }} />
            </div>
            <div className="relative">
              <div className="w-[30px] h-[30px] bg-white rounded-full flex items-center justify-center">
                <img
                  src="https://c.animaapp.com/mc6n3jxhPDSCCl/img/vector-1.svg"
                  alt="Instagram"
                  className="w-[15px] h-[15px]"
                />
              </div>
              <img
                src="https://c.animaapp.com/mc6n3jxhPDSCCl/img/clarity-cursor-hand-click-line.svg"
                alt="Hand"
                className="absolute top-[26px] left-[13px] w-6 h-6"
              />
            </div>
            <div className="w-[30px] h-[30px] bg-[#1a1a1a] rounded-full flex items-center justify-center">
              <Email sx={{ color: "white" }} />
            </div>
          </div>
        </div>
        <div className="w-full p-10 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col t:flex-row gap-4">
            <TextField
              name="firstName"
              label="First Name"
              fullWidth
              variant="standard"
              value={formData.firstName}
              onChange={handleChange}
            />
            <TextField
              name="lastName"
              label="Last Name"
              fullWidth
              variant="standard"
              value={formData.lastName}
              onChange={handleChange}
            />
          </div>

          {/* Email + Phone */}
          <div className="flex flex-col t:flex-row gap-4">
            <TextField
              name="email"
              label="Email"
              fullWidth
              variant="standard"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
            <TextField
              name="phone"
              label="Phone Number"
              fullWidth
              variant="standard"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {/* Enquiry Type */}
          <FormControl>
            <FormLabel className="text-start text-[#4BB7BA]">
              Enquiry Type
            </FormLabel>
            <RadioGroup
              row
              name="enquiryType"
              value={formData.enquiryType}
              onChange={handleChange}
            >
              {subjectOptions.map((option) => (
                <FormControlLabel
                  key={option.id}
                  value={option.label}
                  control={<Radio />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
          </FormControl>

          {/* Message */}
          <TextField
            name="message"
            label="Message"
            placeholder="Write your message.."
            multiline
            minRows={3}
            variant="standard"
            fullWidth
            value={formData.message}
            onChange={handleChange}
          />

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{
                borderRadius: 4,
                px: 6,
                py: 1.5,
                bgcolor: "#F97544",
                boxShadow: "0px 0px 14px #0000001f",
              }}
            >
              Send Message
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ContactInfoSection;
