const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require("cors");
const nodemailer =require("nodemailer");

const app = express();
app.use(cors());

// Middleware
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/ProjectDB').then(()=>{
    console.log("Connection Successfull")
}).catch(()=>console.log("not connected"));

// --------project schema and project model------------//

const projectSchema =new mongoose.Schema({
      projectTitle:String,
      projectDescription:String,
      date:String,
      deadline:String

})

const project = mongoose.model("project",projectSchema);

// --------user schema  and user model----------//

const userSchema = new mongoose.Schema({
    userName: String,
    age: Number,
    phoneNumber: String,
    email: String,
    firebaseId: String,
    role: String
  });

  const User = mongoose.model('User', userSchema);


  const credential =mongoose.model('credential',{},"credential")

//   ---user route------//

// -------to checkSignup with email-----------//
const allowedTeachers = ['akhshy@emcacademy.edu', 'agneljohn@emcacademy.edu', 'jagir@emcacademy.edu'];

app.post('/api/checkSignup', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ allowed: false, message: 'Email is required' });
    }

    const domain = email.split('@')[1];
    const isAllowedTeacher = allowedTeachers.includes(email);

    if (domain === 'emcacademy.edu' && !isAllowedTeacher) {
        return res.send({ allowed: false, message: 'Only specific teachers with @emcacademy.edu domain are allowed to sign up.'});
    }

    return res.status(200).json({ allowed: true });
});

// --------to user signup-----------//

app.post('/api/signup', async (req, res) => {
    const { userName, age, phoneNumber, email, firebaseId } = req.body;

    // Extract the domain from the email
    const domain = email.split('@')[1];
    console.log('Domain:', domain);
     
    const isAllowedTeacher = allowedTeachers.includes(email);
    console.log('Is allowed teacher:', isAllowedTeacher);

    let role = 'student'; 
    if (domain === 'emcacademy.edu' && isAllowedTeacher) {
        console.log(`Email ${email} ends with emcacademy.edu and is in the allowed teachers list.`);
        role = 'teacher';
    }

    console.log('Role:', role);

    const user = new User({
      userName,
      age,
      phoneNumber,
      email,
      firebaseId,
      role
    });
  
    try {
      const newUser = await user.save();
      console.log("User profile created:", newUser);
      res.status(201).json(newUser);
    } catch (err) {
      console.error("Error creating user profile:", err);
      res.status(400).json({ message: err.message });
    }
});



  // -------User login route----------//

app.post('/api/login', async (req, res) => {
    const { email, firebaseId } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.firebaseId !== firebaseId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Send user profile data
        res.status(200).json(user);
        console.log(user)
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});





// User update route
app.put('/api/edit-profile/:id', async (req, res) => {
    const userId = req.params.id;
    const { userName, age, phoneNumber, email } = req.body;

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, {
            userName,
            age,
            phoneNumber,
            email
        }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// -----user role check------/

app.get("/api/user/role/:firebaseUserID", async function(req, res) {
    const id = req.params.firebaseUserID;
    
    try {
        const user = await User.findOne({ firebaseId: id });
        
        if (user) {
            res.status(200).json(user); 
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});





// --Project route----//

// ---------to create projects-------------//

app.post("/api/projects/create", function(req, res) {
    const projectDetail = req.body;
    console.log(projectDetail);

    project.create(projectDetail)
        .then((createdProject) => {
            console.log("Project saved successfully:", createdProject);
            res.send(createdProject);
        })
        .catch((error) => {
            console.error("Error saving project:", error);
            res.status(500).send("Internal Server Error"); 
        });
});

// ------to view projects-------------//

app.get("/api/projects", async function(req,res){

    try{
        await project.find().then((data)=>{
            // console.log(data);
            res.send(data);
        }).catch((error)=>{
            res.send("data not found",error)
        })
    }catch(error){
        res.send("fetch error:",error)
    };

});

// ------------to edit project---------//

app.get('/api/projects/:id',async function(req,res){

    const id = req.params.id
    await project.findById({_id:id}).then((data)=>{
        // console.log(data)
         res.send(data)
    }).catch((error)=>{
       res.send("Id not found: ",error);
    })
})


app.put('/api/projects/edit/:id',async function(req,res){
       const id =req.params.id
       console.log(id)

       await project.findByIdAndUpdate({_id:id},{projectDescription:req.body.projectDescription})
       .then(function(){
        console.log("update successfull")
        res.send("update successfull");
       }).catch(()=>{
        res.send("update failed");
       })

})

// -------to delete project ------------//

app.delete('/api/projects/delete/:id',function(req,res){
    const id = req.params.id

    project.findByIdAndDelete({_id:id}).then(()=>{
        console.log("delete success");
        res.send("delete success")
     }).catch((error)=>res.send(error));
    })


    // --------to send invitation----------- //
    
  
  
    app.post('/api/invite-student', async (req, res) => {
        const { email } = req.body;
    
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
    
        try {
            const data = await credential.find();
            const { user, pass } = data[0].toJSON();
    
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user,
                    pass
                }
            });
    
            const signupLink = 'http://localhost:3000/signup';
    
            const mailOptions = {
                from: 'vijayantony07@gmail.com',
                to: email,
                subject: 'Invitation to Sign Up',
                text: `Hello,\n\nYou have been invited to sign up for project view. Click the following link to register: ${signupLink}`
            };
    
            await transporter.sendMail(mailOptions);
            res.status(200).json({ message: 'Invitation email sent successfully' });

        } catch (error) {
            console.error('Error sending invitation email:', error);
            res.status(500).json({ message: 'Failed to send invitation email' });
        }
    });
    
  
  



// Start server
app.listen(4000, () => console.log('Server running on port 4000'));
