FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests
EXPOSE 8080
CMD ["java", "-jar", "target/expense-tracker-1.0.0.jar"]
