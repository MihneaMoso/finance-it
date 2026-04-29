# Welcome to Finance-It
### Team name: Finance-It
### Team members:
 - Mosorescu Mihnea (Student at "Tudor Vianu" National Computer Science High School)
 - Stefan Panait (Student at "Mihai Eminescu" National High School) 

<!-- This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app). -->
Finance-It is an inclusive, open-source finance education platform that leverages modern social media interfaces and algorithms (similar to platforms like TikTok/Instagram) with its goal being educating young people on financial and monetary topics.

The app's interface is organized as follows:
 - __The main Home page__: A scrollable UI where you interact with financial questions (either multiple choice or numeric answers);
 - __The Learn page__: A carefully tailored roadmap of lessons, practices and tests to help users study efficiently, providing useful and verified educational resources;
 - __The Flashcards page__: Users have access to Anki-style flashcards right in the app, offering structured learning;
 - __The Account page__: Authentication is made easy so saving your progress and algorithm preferences is a no-brainer;

**The algorithm**:
 - Users are being shown questions that the Machine-Learning model decides are most relevant to them, based on a recommender
 - The small Python recommender predicts “how likely is this user to answer correctly for this concept right now?” and then recommends the lowest predicted probabilities first (i.e., what you’re weakest on).

## Our technology stack:
 - **For the frontend:**
   - Expo with React for the mobile and web app
   - I18next for the internationalization of languages
  
 - **For the backend:**
   - Firebase Firestore for storing data
   - Clerk for authentication
   - Python with Skicit-Learn for training the model

### Links:
 - Pitch: https://drive.google.com/file/d/1beQRFy7EXuzrnLRcDdW_q5CidtIZXKZz/view?usp=sharing
 - Demo: ``